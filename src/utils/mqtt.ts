import mqtt from 'mqtt'
class MQTT {
    url: string
    topic: string
    client: any
    password: string
    username: string
    constructor(topic: any) {
        this.topic = topic
        // this.url = "ws://192.168.0.83:1884"
        // // this.url = "wss://wangchaobxiot.zeekrlife-test.com:443"
        // this.username = 'zeekrmq'
        // this.password = 'zeekr@2024!mqtt'



        // this.url = "ws://10.205.66.8:1884"
        // // this.url = "wss://ibmsiot.zeekrlife.com/"
        // this.username = 'zeekr_iot_platform'
        // this.password = 'jp2cJFJ1AEeOFUPYcWLF'
    }
    //初始化mqtt
    init() {
        //add by jimmy 1015
        let mqttstring="eyJ1cmwiOiJ3czovLzEwLjIwNS42Ni44OjE4ODQiLCJ1c2VybmFtZSI6InplZWtyX2lvdF9wbGF0Zm9ybSIsInBhc3N3b3JkIjoianAyY0pGSjFBRWVPRlVQWWNXTEYifQ=="
        if(localStorage.getItem("data") && JSON.parse(localStorage.getItem("data")).spaceObject){
            console.log("mqtt init data",JSON.parse(localStorage.getItem("data")).spaceObject)
            if(JSON.parse(localStorage.getItem("data")).spaceObject.mqttstring){
                mqttstring = JSON.parse(localStorage.getItem("data")).spaceObject.mqttstring
            }
            // let spaceObject = JSON.parse(localStorage.getItem("data")).spaceObject
        }else{
            // let sp = {
            //     url:'ws://10.138.43.109:1883',
            //     username:'zeekr',
            //     password:'zeekr'
            // }
            // console.info(btoa(JSON.stringify(sp)))
            console.log("mqtt init data ",0)
        }
        // this.url = JSON.parse(atob(mqttstring)).url
        // this.username = JSON.parse(atob(mqttstring)).username
        // this.password = JSON.parse(atob(mqttstring)).password


        this.url = "wss://z650480e.ala.cn-hangzhou.emqxsl.cn:8084/mqtt"
        this.username = "buildingos"
        this.password = "Dvdv1205"



        console.log(atob(mqttstring))
        //end by jimmy
        let data = localStorage.getItem("data");
            if(data){//绑定了才进行按照固定clientID的连接 add by jimmy
                this.client = mqtt.connect(this.url, {
                    // clientId:`mroom_${JSON.parse(data).space}_${JSON.parse(data).floorarea}_${JSON.parse(data).floor}_${JSON.parse(data).code}`,
                    // clean: false, // 保留会话
                    clean:true,
                    connectTimeout: 4000, // 超时时间
                    reconnectPeriod: 1000, // 重连时间间隔
                    username: this.username,
                    password: this.password,
                }
    )
            }else{
                this.client = mqtt.connect(this.url,  {
                    clean: true, // 保留会话
                    connectTimeout: 4000, // 超时时间
                    reconnectPeriod: 1000, // 重连时间间隔
                    username: this.username,
                    password: this.password,
                })
            }
            
            this.client.on('error', (error: any) => {
                console.log(error)
            })
            this.client.on('reconnect', () => {
                console.log('正在重连:')
            })

        
    }
    //取消订阅
    unsubscribe(topic: string) {
        this.client.unsubscribe(topic, (error: any) => {
            if (!error) {
                console.log(topic, '取消订阅成功')
            } else {
                console.log(topic, '取消订阅失败')
            }
        })
    }
    //连接
    link() {
        this.client.on('connect', () => {
            console.log('已经连接成功')
            console.log(this.client.options.clientId)
            // 订阅主题，这里可以订阅多个主题
            // client.subscribe([topic, topic1], () => {
            //   console.log(`订阅了主题 ${[topic, topic1].join('和')}`)
            // })
        })
    }
    //收到的消息
    subscribe(val: string, callback: any) {
        console.log(`订阅主题${val}`)
        this.client.subscribe(val)
        this.client.on('message', callback)
    }
    //发布的消息
    publish(topic: string, message: string) {
        // console.info(topic)
        // console.info(message)
        // console.log(this.client)
        console.log(`发布主题${topic}`)
        this.client.publish(topic, message)
    }
    //结束链接
    over() {
        this.client.end()
    }
}
export default MQTT
