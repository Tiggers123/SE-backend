export interface expense {
    id: number;
    datetime: Date;
    orderid: number;
    quantity: number[];
    name: string[];
    price: number[];
    totalprice: number;
}