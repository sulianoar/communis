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
    }
  ]
});

run();

async function run(){
    getTemperature().then(() => getMemory());
    setTimeout(function() { run(); }, 5000);
}

async function getTemperature(){
    let workers = await getWorkers();
    if (workers && workers.length > 0){
        job = await createJob(workers.map(a => a.id), "vcgencmd measure_temp");
        if (job){
            setTimeout(async function () {
                pool = await getPool(job.pool_id);
                if (pool){
                    for (let job of pool[0].jobs) {
                        writeToDb(job.worker_id, parseFloat(job.result.match(/[\d.]+/)));
                    }
                }
            }, 1000);
        }
    }
}

async function getMemory(){
    let workers = await getWorkers();
    if (workers && workers.length > 0){
        jobMemory = await createJob(workers.map(a => a.id), "./memory.sh")
        if (jobMemory){
            setTimeout(async function () {
                poolMemory = await getPool(jobMemory.pool_id);
                if (poolMemory){
                    for (let job of poolMemory[0].jobs) {
                        writeMemoryToDb(job.worker_id, parseInt(job.result));
                    }
                }
            }, 1000);
        }
    }
}


function writeToDb(worker, value) {
    influx.writePoints([{
        measurement: "temperature",
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

function writeMemoryToDb(worker, value) {
    influx.writePoints([{
        measurement: "memory",
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