import express from 'express';
import { registerControllers } from './server';
import { Logger } from './logging/logger';
import {Auth, logRequest} from "./MiddleWare";
import {
  BoardController,
  HelloController,
  ListController,
  UserController,
  TicketController
} from './controllers';
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', `${process.env.HOST_URL}`);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
app.use(logRequest);
app.use(Auth);
const port = 3000;
app.get('/', (req, res) => {
  res.status(200).send({
    message: 'Hello, World!'
  });
})
registerControllers(app, [
  BoardController,
  HelloController,
  ListController,
  UserController,
  TicketController
]);
app.listen(port, () => {
  Logger.info(`Server is running on http://localhost:${port}`);
});
