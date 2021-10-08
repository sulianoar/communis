const fetch = require('node-fetch');

const masterApiAdress = "http://192.168.0.88"

async function getTemperature() {
    let workers = await fetch(masterApiAdress+"/workers").then(response => response.json());
    let w = workers.map(a => a.id);
    let jobOpts = {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify( {cmd:"vcgencmd measure_temp", workers: w}) 
    };
    let pool = await fetch(masterApiAdress+"/job", jobOpts).then(response => response.json());

    setTimeout(async function () {
        let poolResult = await fetch(masterApiAdress+"/pool/"+pool.pool_id).then(response => response.json());
        for (let job of poolResult[0].jobs) {
            console.log(job.worker_id + " : " +parseFloat(job.result.match(/[\d.]+/)));
        }
    }, 2000);

}

getTemperature();