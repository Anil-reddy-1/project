import dotenv from 'dotenv'
import {createClient} from 'redis'
dotenv.config();

const redis_uri= process.env.REDIS_HOST+"/"
const redis = createClient({ 
    url: "redis://:Anil@123@localhost:6379"
})

await redis.connect();

console.log("redis connection test ping ",await redis.ping());

await redis.close();