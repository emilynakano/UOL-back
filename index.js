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
});
server.post('/messages', async(req, res)=> {
    const {type, to, text} = req.body;
    const from = req.headers.user;

    try {
        const participants = await db.collection('participants').find().toArray();
        const nameParticipants = participants.map((part)=>{return part.name})
        
        const typeMessage = ["message", "private_message"]
        const participantSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.valid(...typeMessage),
            from: joi.valid(...nameParticipants)
        })
        const validate = participantSchema.validate({type, to, text, from})
        if(validate.error) {
            return res.sendStatus(422)
        }
        await db.collection('messages').insertOne({from, to, text, type, time: dayjs().format('HH:mm:ss')});
        res.sendStatus(201)
    } catch {
        res.send("something is wrong")
    }
    
});
server.get('/messages', async(req, res)=> {
    const from = req.headers.user;
    const limit = parseInt(req.query.limit);
    
    try{
        const messages = await db.collection('messages').find().toArray();
        const filterMessages = messages.filter(verification)

        function verification (message) {
            if(message.type !== "private_message" || message.from === from || message.to === from) {
                return message
            }
        }
        
        filterMessages.reverse()
        if(limit) {
            filterMessages.length = limit;
        }
        filterMessages.reverse()

        res.send(filterMessages);
    }catch {
        res.send("something is wrong")
    }
});
server.post('/status', async(req, res) => {
    const userAtualize = req.headers.user;
    try {
        const userExist = await db.collection('participants').findOne({name: userAtualize});
        if(!userExist || !userAtualize) {
            return res.sendStatus(404)
        }
        await db.collection('participants').insertOne({ name:userAtualize, lastStatus: Date.now()});
        
        res.sendStatus(201)
    } catch {
        res.send("something is wrong")
    }
    
})

server.listen(5000)
