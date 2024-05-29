import express from 'express';
import { registerControllers } from './server';
import { Logger } from './logging/logger';
import { logRequest }  from "./MiddleWare";
import fs from 'fs';
import path from "node:path";
import https from 'https';
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
app.use(logRequest);
const port = 3000;

registerControllers(app, [
  BoardController,
  HelloController,
  ListController,
  UserController,
  TicketController
]);

if(process.env.MODE !== 'dev') {
  Logger.debug("Starting server in production mode");
  const privateKey = fs.readFileSync(path.join(__dirname, '../ssl/privkey.pem'), 'utf8');
  const certificate = fs.readFileSync(path.join(__dirname, '../ssl/fullchain.pem'), 'utf8');
  const credentials = { key: privateKey, cert: certificate };
  const httpsServer = https.createServer(credentials, app);

  httpsServer.listen(port, () => {
    Logger.info(`Server is running on http://localhost:${port}`);
  });
}
else {
    app.listen(port, () => {

        Logger.info(`Server is running on http://localhost:${port}`);
    });
}
