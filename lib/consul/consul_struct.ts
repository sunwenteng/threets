
export type ServiceCheck = {[Type:string]:string};

export class AgentServiceRegister {
    id:string = '';
    name:string = '';
    tags:string[] = [];
    address:string = '';
    port:number = 0;
    check:ServiceCheck = {};
}