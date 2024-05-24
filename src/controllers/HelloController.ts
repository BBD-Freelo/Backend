import { Request, Response } from 'express';
import { Controller, Get, Post } from "../decorators";
import { controller, EndpointDefenition } from '../interfaces';
import { DBPool } from '../database';

@Controller('/api')
export class HelloController implements controller {
  // Define these to make the interface happy
  endpoint!: string;
  endpoints!: { [key: string]: EndpointDefenition; };
  // define these to make the array in index.ts happy
  static endpoint = '';
  static endpoints = {}

  @Get('/hello')
  hello(req: Request, res: Response) {
    res.send('Hello, World!');
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