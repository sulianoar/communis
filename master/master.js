/*
Communis master's agent
*/

const net = require('net');
const express = require('express');
const bodyParser = require('body-parser');

const masterAdress = '10.10.0.1';
const masterPort = 7000;
const webClientPort = 80;
const poolRetention = 300000; // 5minutes

const server = express();

var workersClients = [];
var poolList = [];

class Job {
    constructor(code, pool,cmd, pid, result, status, worker_id, time_to_calc) {
        this.code = code;
        this.pool = pool;
        this.cmd = cmd;
        this.pid = pid;
        this.result = result;
        this.status = status;
        this.worker_id = worker_id;
        this.time_to_calc = time_to_calc;
    }
}

class Pool {
    constructor(id, status, jobs, cached_at){
        this.id = id;
        this.status = status;
        this.jobs = jobs;
        this.cached_at = this.cached_at;
    }
}

class Worker{
    constructor(id, socket){
        this.id = id;
        this.socket = socket;
    }
}

server.use(bodyParser.json());

// Get pool cached list
server.get('/pools', function(request, response) {
    response.status(200).json(poolList);
});

// Get detail of a specific pool
server.get('/pool/:id', function(request, response) {
    let pool = poolList.filter(p => { return p.id === parseInt(request.params.id) });
    if (pool.length === 1){
        response.status(200).json(pool);
    } else {
        response.status(404).json({ message: "Pool ID not found or expired" });  
    }
});

// Get workers
server.get('/workers', function(request, response) {
    response.status(200).json(workersClients);
});

// Start new job
server.post('/job', function(request, response){
    let poolId = Math.floor(Date.now());
    if (allWorkersExist(request.body.workers)){
        if ( typeof request.body.cmd !== 'undefined' && request.body.cmd){
            execJob(poolId, request.body.workers, request.body.cmd);
            response.status(200).json({ pool_id : poolId, message: "New pool submited" });
        } else {
            response.status(400).json({ message: "Missing command" });
        }
    } else {
        response.status(400).json({ message: "One or more worker not connected, try GET /workers" });
    }
});

// Kill a job
server.put('/kill/:pool', function(request, response){
    if (allWorkersExist(request.body.workers)){
        if ( poolList.findIndex( p => (p.id.toString() === request.params.pool )) > -1){
            killJob(request.body.workers, request.params.pool);;
            response.status(200).json({ message: "Trying to kill job from pool : "+ request.params.pool +" on "+request.body.workers });
        } else {
            response.status(404).json({ message: "Pool ID not found or expired" });
        }
    } else {
        response.status(400).json({ message: "One or more worker not connected, try GET /workers" });
    }
});

server.listen(webClientPort);
console.log('[ + ] Master listening for REST API request on ' + masterAdress +':'+ webClientPort);

net.createServer(function(socket) {
    socket.on('data', function(data) {
        var clientMessage = JSON.parse(data.toString());

        if (clientMessage.code === "HELLO"){ // If it is a new worker connection
            var workerClientExist = workersClients.findIndex(w => (w.id === clientMessage.worker_id) ); // Search for this client in workersClients
            if (workerClientExist >= 0){
                console.log('[ ! ] '+clientMessage.worker_id +' already exist...');
                socket.end();
            }else{ // Create new worker
                workersClients.push(new Worker(clientMessage.worker_id, socket));
                console.log('   [ + ] ' + clientMessage.worker_id+ ' connected from ' + socket.remoteAddress +':'+ socket.remotePort); 
            }
        }else {
            if (clientMessage.code === "JOB"){
                let poolIndex = poolList.findIndex( p => (p.id.toString() === clientMessage.pool )); // Search for this pool in poolList
                let jobIndex = poolList[poolIndex].jobs.findIndex( (j) => j.worker_id === clientMessage.worker_id ); // Search for this job in that pool
                if ( jobIndex > -1 ){ // Be sure job exist
                    // Update job
                    poolList[poolIndex].jobs[jobIndex].result = clientMessage.result;
                    poolList[poolIndex].jobs[jobIndex].pid = clientMessage.pid;
                    poolList[poolIndex].jobs[jobIndex].status = clientMessage.status;
                    poolList[poolIndex].jobs[jobIndex].time_to_calc = clientMessage.time_to_calc;
                    if (clientMessage.status !== null){ // Finished with or without error
                        console.log('       [ - ] ' +clientMessage.worker_id +" finished job '"+clientMessage.cmd+"' du pool "+clientMessage.pool + " in "+ clientMessage.time_to_calc)
                        if(poolList[poolIndex].jobs.findIndex( (j) => j.status === null ) === -1) { // If there are no more running job in this pool
                            // If there no error on all job status in this pool, we can set status at 0, else we set it to 1 (exit with error)
                            if(poolList[poolIndex].jobs.findIndex( (j) => j.status === 1 ) === -1){
                                poolList[poolIndex].status = 0
                            } else {
                                poolList[poolIndex].status = 1
                            }
                            poolList[poolIndex].cached_at = Math.floor(Date.now()); // Setup cache timestamp
                        }
                    }
                }
            }
        }
    });

    socket.on('error', (err) => {
        if (err.code === 'ECONNRESET'){
            let quitClient =  workersClients.filter(w => { return w.socket.remoteAddress === socket.remoteAddress && w.socket.remotePort === socket.remotePort;});
            console.error('   [ - ] ' + quitClient[0].id + ' disconnected');
            workersClients = workersClients.filter(w => { return w.id !== quitClient[0].id; });
        }
    })
}).listen(masterPort, masterAdress);
console.log('[ + ] Master listening for worker on ' + masterAdress +':'+ masterPort);

// Pool cache cleaning
setInterval(async function () {
    cleanPool();
}, 5);

function allWorkersExist(workers){
    for (let w of workers) {
        if (workersClients.findIndex(wo => (wo.id === w)) === -1){
            return false;
        }
    }
    return true;
}

function execJob(poolId, workers, cmd){
    let workersJobs = [];
    for (let w of workers) {
        let currentWorkerIndex = workersClients.findIndex(wo => (wo.id === w));
        let worker = workersClients[currentWorkerIndex];
        let job = new Job("JOB", poolId.toString(),cmd, null, null, null , worker.id, null);
        worker.socket.write(JSON.stringify(job));
        workersJobs.push(job);
    }
    poolList.push(new Pool(poolId, null, workersJobs, null));
}

function killJob(workers, poolId){
    for (let w of workers) {
        let currentWorkerIndex = workersClients.findIndex(wo => (wo.id === w));
        let worker = workersClients[currentWorkerIndex];
        let jobs = poolList[poolList.findIndex( p => (p.id.toString() === poolId ))].jobs;
        let pidToKill = jobs[jobs.findIndex( j => (j.worker_id === w ))].pid;
        worker.socket.write(JSON.stringify({"code" : "KILL", "pid" : pidToKill}));
    }
}

async function cleanPool(){
    poolList = poolList.filter(p => {
        return p.status === null || (p.cached_at+poolRetention) >= Math.floor(Date.now());
    });
}





