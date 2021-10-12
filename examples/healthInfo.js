// TODO :
// - Add uptime

const fetch = require('node-fetch');
const Influx = require("influx");

const masterApiAdress = "http://127.0.0.1"


const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 3000)

const influx = new Influx.InfluxDB({
  host: "127.0.0.1",
  database: "clusterdb",
  username: "grafana",
  password: "grafana",
 
  schema: [
    {
        measurement: "temperature",
        fields: { value: Influx.FieldType.FLOAT },
        tags: ["worker"]
    },
    {
        measurement: "cpu",
        fields: { value: Influx.FieldType.FLOAT },
        tags: ["worker"]
    },
    {
        measurement: "memory",
        fields: { value: Influx.FieldType.FLOAT },
        tags: ["worker"]
    },
    {
        measurement: "info",
        fields: { online: Influx.FieldType.BOOLEAN, adress: Influx.FieldType.STRING },
        tags: ["worker"]
    }
  ]
});

run();

var previousWorker = [];

async function run(){
    let workers = await getWorkers();
    if (workers){
        getTemperature(workers);
        getMemoryUsage(workers);
        getCpuUsage(workers);
        getWorkerInfo(workers);
    }
    setTimeout(function() { run(); }, 5000); // Execute all every 5s
}

async function getTemperature(w){
    if (w && w.length > 0){
        job = await createJob(w.map(a => a.id), "vcgencmd measure_temp");
        if (job){
            saveJobResult("temperature", job.pool_id);
        }
    }
}

async function getMemoryUsage(w){
    if (w && w.length > 0){
        job = await createJob(w.map(a => a.id), "bash -c \"exec free -m | awk 'NR==2 {printf $3*100/$2}'\"");
        if (job){
            saveJobResult("memory", job.pool_id);
        }
    }
}

async function getCpuUsage(w){
    if (w && w.length > 0){
        job = await createJob(w.map(a => a.id), "bash -c \"top -bn1 | grep load | awk '{printf $(NF-2)}'\"");
        if (job){
            saveJobResult("cpu", job.pool_id);
        }
    }
}

async function getWorkerInfo(workers){
    let workerIds = workers.map(a => a.id);

    let newOnlineWorker = workerIds.filter(x => !previousWorker.includes(x)); // Return all worker not already in previousWorker
    let newOfflineWorker = previousWorker.filter(x => !workerIds.includes(x)); // Return all previousWorker not in worker
    for (online of newOnlineWorker){
        w = workers[workers.findIndex(w => (w.id === online))]
        writeToDb("info", w.id, { online:true, adress:w.socket._peername.address+":"+w.socket._peername.port});
        previousWorker.push(online);
    }
    for (offline of newOfflineWorker){
        writeToDb("info", offline, {online:false, adress:""});
        previousWorker.splice(previousWorker.indexOf(offline), 1);
    }
}

async function saveJobResult(measurement, poolId, tryBeforeClean=0){
    pool = await getPool(poolId);
    if (tryBeforeClean !== 50){ // MAX Time to get job done is 50s (50*1000ms)
        if (pool && pool[0].status !== null){ // If all job are done
            for (let job of pool[0].jobs) {
                if (job.status === 0){ // If job is done without error we can save result to bdd
                    writeToDb(measurement, job.worker_id,  {value : parseFloat(job.result.match(/[\d.]+/))});
                } else {
                    console.log("Job in pool "+poolId+" from "+job.worker_id+" finished with error")
                }
            }
        } else{
            setTimeout(function() { 
                tryBeforeClean = tryBeforeClean+1;
                saveJobResult(measurement, poolId, tryBeforeClean); 
            }, 1000); // Retry to get result until status is done
        }
    } else {
        console.log("Pool "+poolId+" not responding for 50 seconds, pass")
    }
}


function writeToDb(measurement, worker, value) {
    influx.writePoints([{
        measurement: measurement,
        tags: { worker: worker },
        fields: value
    }],
    {
        database: "clusterdb",
        precision: "s"
    }).catch(err => {
        console.log(err)
      console.error("Error writing data to Influx.");
    });
}



async function getWorkers(){
    return await fetch(masterApiAdress+"/workers", { signal: controller.signal } ).then(response => response.json());
}

async function createJob(workersIds, cmd){
    let jobOpts = {
        signal: controller.signal,
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify( {cmd:cmd, workers: workersIds}) 
    };
    return await fetch(masterApiAdress+"/job", jobOpts).then(response => response.json());
}

async function getPool(poolId){
    return await fetch(masterApiAdress+"/pool/"+poolId, { signal: controller.signal }).then(response => response.json());
}