/*
Communis worker's agent
*/

const net = require('net');
const os = require("os");
const spawn = require('child_process').spawn;
const {parseArgsStringToArgv} = require('string-argv');

const masterAdress = '10.10.0.1';
const masterPort = 7000;
const waitBeforeRetryOnConnError = 3000;

const client = new net.Socket();

class Job {
    constructor(code, pool,cmd, pid, result, status, time_to_calc) {
        this.code = code;
        this.pool = pool;
        this.worker_id = os.hostname();
        this.cmd = cmd;
        this.pid = pid;
        this.result = result;
        this.status = status;
        this.time_to_calc = time_to_calc;
    }
}

/* COMMUNICATION */
function connect() {
    client.connect({ port: masterPort, host: masterAdress});
}

client.on('connect', () => {
    helloMsg = JSON.stringify({"code":"HELLO", "worker_id":os.hostname()});
    client.write(helloMsg);
    console.log('Connected to master');
})

//Loop on error, wait 3s and re-try connection
client.on('error', (err) => {
    if (err.code === 'ECONNREFUSED'){
        setTimeout(function() { 
            console.error('Connection error');
            connect();
        }, waitBeforeRetryOnConnError);
    }
})

client.on('data', function(data) {
    var masterMsg = JSON.parse(data.toString())
    if (masterMsg.code === "JOB"){
        execJob(masterMsg);
    }
    if (masterMsg.code === "KILL"){
        console.log("Killing pid : " +masterMsg.pid);
        process.kill(parseInt(masterMsg.pid));
    }
});

client.on('close', function() {
    console.log('Socket closed');
    setTimeout(function() { 
        connect();
    }, waitBeforeRetryOnConnError);
});

connect()

function execJob(data){

    let args = parseArgsStringToArgv(data.cmd);
    let cmd = args.shift();

    let child = spawn(cmd, args, {detached: true});
    console.log("Running "+data.cmd);

    let job = new Job("JOB", data.pool, data.cmd, child.pid, "" ,null, "");
    
    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (data) => {
        job.result = job.result+data.replace(/[\n\r]/g, ""); // Concatenate stdout without line break
        client.write(JSON.stringify(job));
    });  

    child.stderr.on('data', (data) => {
        job.result = job.result+data
        client.write(JSON.stringify(job));
    }); 

    child.on('error', (err) => {
        console.log(err.message);
    }); 
    
    child.on('exit', function(exitCode) {
        job.time_to_calc = (Math.floor(Date.now()) - data.pool);
        job.result = job.result;
        job.status = exitCode;
        client.write(JSON.stringify(job));
    })
}








