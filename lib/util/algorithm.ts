
export type DAG = {[node:string]:string[]};

class Visit {
    key:string = '';
    d:number = 0;
    f:number = 0;
    in_dig:number = 0;
    constructor(key) {
        this.key = key;
    }
}

type VisitMap = {[key:string]:Visit};

export function topologicalSort(dag:DAG):string[] {
    var vis:VisitMap = {};
    Object.keys(dag).forEach((key) => {
        vis[key] = new Visit(key);
    });

    Object.keys(dag).forEach((key) => {
        dag[key].forEach((k) => {
            if (!vis[k])
                vis[k] = new Visit(k);
            vis[k].in_dig++;
        });
    });

    function visitDFS(k, count):number {
        var last = vis[k].d = ++count;
        if (dag[k]) {
            for (var i = 0; i < dag[k].length; i++) {
                var n = dag[k][i];
                if (vis[n].d && !vis[n].f) throw new Error('back edge ' + k + ' => ' + n);
                if (!vis[n].d) last = visitDFS(n, last);
            }
        }

        vis[k].f = ++last;
        return last;
    }

    var count = 0;
    Object.keys(vis).forEach((k) => {
        var v = vis[k];
        if (!v.d && !v.in_dig)
            count = visitDFS(k, count);
    });

    var list = Object.keys(vis)
        .map(function (k) {
            return vis[k];
        });

    var unVisit = [];
    list.forEach(function (v) {
        if (v.d === 0) unVisit.push(v.key);
    });

    if (unVisit.length > 0) throw new Error('exist circle in ' + unVisit.join(','));

    return list
        .sort((a, b) => { return b.f - a.f; })
        .map((v) => {return v.key;});
}