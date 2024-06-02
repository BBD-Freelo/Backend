import { Request, Response, NextFunction } from 'express';
import { DBPool } from '../database';
import {QueryResult} from "pg";
import jwt from 'jsonwebtoken';
import  jwksClient, { SigningKey } from 'jwks-rsa';

const client = jwksClient({
    jwksUri: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_4iGnsfNem/.well-known/jwks.json'
});

function getKey(header: any, callback: (err: any, key: any) => void) {
    client.getSigningKey(header.kid, function (err: any, key: any) {
        if (err) {
        callback(err, null);
        } else if (key) {
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
        } else {
        callback(new Error('Key not Found'), null);
        }
    });
}

export function verifyToken(req: any, res: any, next: any) {
    next();
    // const token = req.headers.authorization;

    // if (!token) {
    //   res.status(401).send('Access token is missing');
    //   return;
    // }

    // jwt.verify(token, getKey, {
    //     audience: '4hveqs7l8i0jon1n4h75dp6muk',
    //     issuer: `https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_4iGnsfNem`     
    // }, (err: any, decoded: any) => {
    //     if (err) {
    //         res.status(401).send('Access token is invalid');
    //         return;
    //     }

    //     req.user = decoded;
    //     next();
    // });
};