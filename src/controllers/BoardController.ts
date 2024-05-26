import { Request, Response } from 'express';
import { Controller, Get, Post } from "../decorators";
import { controller, EndpointDefenition } from '../interfaces';
import { List } from "../interfaces/entities";
import { DBPool } from '../database';

@Controller('/board')
export class BoardController implements controller {

    endpoint!: string;
    endpoints!: { [key: string]: EndpointDefenition; };

    static endpoint = '';
    static endpoints = {}

    // Or id?
    @Get('/:name')
    hello(req: Request, res: Response<List[]>) {
        const { name } = req.params;

        const board: List[] = [ { id: 1, name: "todo", tickets: [ { id: 1, name: "Get to work" }, { id: 2, name: "Pick up groceries" }, { id: 3, name: "Go home" }, { id: 4, name: "Fall asleep" } ] }, { id: 2, name: "busy", tickets: [ { id: 5, name: "Get up" }, { id: 6, name: "Brush teeth" }, { id: 7, name: "Take a shower" }, { id: 8, name: "Check e-mail" }, { id: 9, name: "Walk dog" } ] }, { id: 3, name: "done", tickets: [ { id: 10, name: "grad stuff" } ] }, { id: 4, name: "backlog", tickets: [ { id: 11, name: "db versioning" } ] } ]
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