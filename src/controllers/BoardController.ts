import { Request, Response } from 'express';
import { Controller, Get, Post } from "../decorators";
import { controller, EndpointDefenition } from '../interfaces';
import { list } from "../interfaces/entities";
import { DBPool } from '../database';

@Controller('/board')
export class BoardController implements controller {

    endpoint!: string;
    endpoints!: { [key: string]: EndpointDefenition; };

    static endpoint = '';
    static endpoints = {}

    // Or id?
    @Get('/:name')
    hello(req: Request, res: Response<list[]>) {
        const { name } = req.params;

        const board: list[] = [ { id: 1, name: "todo", items: [ { id: 1, name: "Get to work" }, { id: 2, name: "Pick up groceries" }, { id: 3, name: "Go home" }, { id: 4, name: "Fall asleep" } ] }, { id: 2, name: "busy", items: [ { id: 5, name: "Get up" }, { id: 6, name: "Brush teeth" }, { id: 7, name: "Take a shower" }, { id: 8, name: "Check e-mail" }, { id: 9, name: "Walk dog" } ] }, { id: 3, name: "done", items: [ { id: 10, name: "grad stuff" } ] }, { id: 4, name: "backlog", items: [ { id: 11, name: "db versioning" } ] } ]
        res.send(board);
    }

    @Get('/user/:id')
    test(req: Request, res: Response) {
        const { id } = req.params;
        res.send(`User ID: ${id}`);
    }

    @Post('/echo')
    echo(req: Request, res: Response) {
        const { message } = req.body;
        res.send(`You said: hey`);
    }

}