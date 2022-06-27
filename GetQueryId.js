
import axios from "axios";
import fs from "fs";

async function GetQueryId(QraphlName, noCheck, forcedUpdate) {

    try {
        noCheck = noCheck || false;
        forcedUpdate = forcedUpdate || false;
        let mainJsId = "";
        let QueryIdListData = {};
        try { QueryIdListData = JSON.parse(fs.readFileSync(`./QueryIdList.json`)); }
        catch (err) {
            console.log('Failed to load QueryIdList.json now clear old file and rebuild one.');
            fs.writeFileSync(`./QueryIdList.json`, JSON.stringify({}));
            QueryIdListData = {};
        }

        if (!noCheck || QueryIdListData === {} || forcedUpdate) {
            //Get mainJsId for request Url
            mainJsId = await axios("https://twitter.com", {
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
                },
                "method": "GET"
            })
                .then((response) => { return response.data.match(/(?<=web\/main\.).*?(?=\.js)/)[0]; })
                .catch((err) => { console.log('get mainJsId fail.'); Promise.reject(new Error(err)); });

        }
        //Check main.xxxxxxxx.js is newest or not. If is newest then skip download main.js and output.


        if ((QueryIdListData.mainJsId != mainJsId && !noCheck) || QueryIdListData === {} || forcedUpdate) {

            //Prase main.xxxxxxxx.js file to get queryId 
            let mainJsUrl = 'https://abs.twimg.com/responsive-web/client-web/main.' + mainJsId + '.js';
            QueryIdListData = await axios(mainJsUrl, {
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
                },
                "method": "GET"
            })
                .then((response) => {

                    let rawList = response.data.match(/queryId\:\"([^"]+)\"\,operationName\:\"([^"]+)\"\,operationType\:\"query\"\,metadata\:\{featureSwitches\:\[([^\[\]]+)?(?=\]\}\}\})/g);

                    let operateName = [];
                    let operateId = [];
                    let queryRawList = [];
                    let operateQuery = {};

                    for (let i = 0, operate = ""; i < rawList.length; i++) {

                        operate = rawList[i];

                        operateId.push(operate.match(/(?<=queryId:").*?(?=")/)[0]);
                        operateName.push(operate.match(/(?<=operationName:").*?(?=")/)[0]);
                        if (operate.match(/(?<=featureSwitches:\[).*/)[0] !== "") {
                            queryRawList = operate.match(/(?<=featureSwitches:\[).*/)[0].match(/(?<=\")([^",]+)(?=\")/g);
                        }
                        else {
                            queryRawList = [""];
                        }
                        operateQuery[operateName[i]] = [];
                        for (let j = 0; j < queryRawList.length; j++) {
                            operateQuery[operateName[i]].push(queryRawList[j]);
                        }

                    }

                    let outputJson = { "mainJsId": mainJsId, "queryInfo": {} };
                    for (let i = 0; i < operateId.length; i++) {
                        outputJson.queryInfo[operateName[i]] = {
                            "queryId": operateId[i],
                            "queryToken": operateQuery[operateName[i]]
                        };
                    }
                    return outputJson;

                })
                .catch((err) => {
                    console.log('get mainJsData fail.');
                    return Promise.reject(new Error(err));
                });


            //update QueryIdList.json
            fs.writeFileSync(`./QueryIdList.json`, JSON.stringify(QueryIdListData, "", "\t"));


        }
        if (Array.isArray(QraphlName)) {

            const returnArray = new Array(QraphlName.length);

            for (let i = 0, operate = ""; i < QraphlName.length; i++) {
                operate = QraphlName[i];
                returnArray[i] = QueryIdListData.queryInfo[`${operate}`];
            }

            return returnArray;

        }
        else if (typeof QraphlName === 'string') {

            if (QraphlName === "all") {
                return QueryIdListData;
            }
            else {
                return QueryIdListData.queryInfo[`${QraphlName}`];
            }
        }
        else {
            throw new Error("Only accept Array or string.");
        }
    } catch (err) {
        console.log(err);
        return -1;
    }

}

export default GetQueryId;