import child_process = require('child_process');

export function getDockerHost():string {
    return child_process.execSync("/sbin/ip route|awk '/default/ { print $3 }'").toString();
}

export function getSelfId():string {
    return child_process.execSync("cat /proc/self/cgroup | grep 'docker' | sed 's/^.*\///' | tail -n1").toString();
}