
class ApiRouter {

    system:{} = {};

    addSystem(name, system):void {
        this.system[name] = system;
    }

    getHandler(name, method):any {
        return this.system[name] ? this.system[name][method] : null;
    }

}

export = ApiRouter;