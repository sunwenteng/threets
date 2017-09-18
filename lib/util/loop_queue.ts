/**
 * 循环队列
 */
class LoopQueue<T> {

    len:number = 0;
    queSize:number = 0;
    index:number = -1;

    que:T[] = [];

    constructor(len:number) {
        this.len = len;
    }

    public Size():number {
        return this.queSize;
    }

    public Top():T {
        return this.queSize === 0 ? null : this.que[this.index];
    }

    public Push(value:T):void {
        if (this.len <= 0) return;

        if (this.queSize < this.len) {
            ++this.index;
            ++this.queSize;
        } else {
            this.index = (this.index + 1) % this.len;
        }
        this.que[this.index] = value;
    }

    public Pop():T {
        if (this.queSize <= 0) return null;

        var tmp = this.que[this.index];
        this.index = (this.index + this.len - 1) % this.len;
        return tmp;
    }

    public Queue():T[] {
        if (this.queSize <= 0) return [];

        if (this.queSize < this.len) {
            return this.que;
        }

        /**
         * input:
         *          index
         *            v
         *      11111112222222
         *
         * output:
         *      22222221111111
         *
         */
        return this.que.slice(this.index + 1).concat(this.que.slice(0, this.index));
    }

}

export = LoopQueue;