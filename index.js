import express, {json} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';

dotenv.config()

import {MongoClient} from 'mongodb'

const client = new MongoClient(process.env.MONGO_URI);
let db;

client.connect().then(() => {
    db = client.db("UOL")
})

const server = express()

server.use(cors());
server.use(json());

const nameSchema = joi.object({
    name: joi.string().required()
})

server.post('/participants', async(req, res) => {
    const name = req.body.name;

    const validate = nameSchema.validate(req.body)
    if(validate.error) {
        return res.sendStatus(422)
    }
    
    const isAnotherName = await db.collection('participants').findOne({name});
    if(isAnotherName) {
        return res.sendStatus(409)
    }

    try {
        await db.collection('participants').insertOne({ name, lastStatus: Date.now()});
        await db.collection('messages').insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss')});
        res.sendStatus(201);
    } catch(err) {
        res.send("something is wrong")
    }
});
server.get('/participants', async(req, res)=>{
    try {
        const participants = await db.collection('participants').find().toArray();
        res.send(participants)
    } catch(err) {
        res.send("something is wrong")
    }
})

server.listen(5000)
