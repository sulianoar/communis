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

var jobList = [];
var previousJobList = [];

function writeToClientroutine(){
    setTimeout(function () { 
        if (jobList !== previousJobList && jobList.length > 0){ // Send to master only on object modification
            client.write(JSON.stringify({"code":"JOBS", "jobs":jobList})); 
            previousJobList = jobList;
            // Cleanup finished job and already sent to master
            jobList = jobList.filter(j => {
                return j.status === null;
            });
        }
        writeToClientroutine();
    }, 3000);
}

writeToClientroutine();

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
    try {
        execJob(JSON.parse(data.toString()));
    } catch (error) {
        console.error(error);
        for (let d of data.toString().split(/(?={)/g)) { // Split multiple job from socket message 
            execJob(JSON.parse(d));
        }
    }
    
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
});

connect()

function execJob(msg){
    if (msg.code === "KILL"){
        console.log("Killing pid : " +msg.pid);
        process.kill(parseInt(msg.pid));
    } 
    if (msg.code === "JOB"){
        let args = parseArgsStringToArgv(msg.cmd);
        let cmd = args.shift();

        let child = spawn(cmd, args, {detached: true, shell:true});
        console.log("Running "+msg.cmd);

        jobList.push(new Job("JOB", msg.pool, msg.cmd, child.pid, "" ,null, ""))

        child.stdout.setEncoding('utf8');

        child.stdout.on('data', (data) => {
            jobList[jobList.findIndex( j => (j.pool.toString() === msg.pool ))].result += data.replace(/[\n\r]/g, ""); // Concatenate stdout without line break
        });  

        child.stderr.on('data', (data) => {
            jobList[jobList.findIndex( j => (j.pool.toString() === msg.pool ))].result += data.replace(/[\n\r]/g, ""); // Concatenate stdout without line break
        }); 

        child.on('error', (err) => {
            console.log(err.message);
        }); 
        
        child.on('exit', function(exitCode) {
            jobList[jobList.findIndex( j => (j.pool.toString() === msg.pool ))].time_to_calc = (Math.floor(Date.now()) - msg.pool);
            jobList[jobList.findIndex( j => (j.pool.toString() === msg.pool ))].status = exitCode;
        })
    }

}






