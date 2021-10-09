const fetch = require('node-fetch');
const Influx = require("influx");

const masterApiAdress = "http://192.168.0.88"

const influx = new Influx.InfluxDB({
  host: "192.168.0.88",
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
    }
  ]
});

run();

async function run(){
    let workers = await getWorkers();
    getTemperature(workers);
    getMemoryUsage(workers);
    getCpuUsage(workers);
    setTimeout(function() { run(); }, 5000); // Execute cmd every 5s
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

async function saveJobResult(measurement, poolId){
    pool = await getPool(poolId);
    if (pool && pool[0].status !== null){ // If all job is done
        for (let job of pool[0].jobs) {
            if (job.status === 0){ // If job is done without error we can save result to bdd
                writeToDb(measurement, job.worker_id, parseFloat(job.result.match(/[\d.]+/)));
            } else {
                console.log("Job in pool "+poolId+" from "+job.worker_id+" finished with error")
            }
        }
    } else{
        setTimeout(function() { saveJobResult(measurement, poolId); }, 1000); // Retry to get result until status is done
    }
}


function writeToDb(measurement, worker, value) {
    influx.writePoints([{
        measurement: measurement,
        tags: { worker: worker },
        fields: { value: value }
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
    return await fetch(masterApiAdress+"/workers").then(response => response.json());
}

async function createJob(workersIds, cmd){
    let jobOpts = {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify( {cmd:cmd, workers: workersIds}) 
    };
    return await fetch(masterApiAdress+"/job", jobOpts).then(response => response.json());
}

async function getPool(poolId){
    return await fetch(masterApiAdress+"/pool/"+poolId).then(response => response.json());
}