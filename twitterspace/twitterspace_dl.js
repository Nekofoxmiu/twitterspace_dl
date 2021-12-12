'use strict';

import axios from "axios";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";


const FFMPEG_PATH = "./ffmpeg\bin"
const FFPROBE_PATH = "./ffmpeg\bin"


const TwitterSpace = async (whoseSpace) => {

    const ToStrKillQuote = (jsonData) => JSON.stringify(jsonData).replace(/\"/g, "");


    const jsonData = await fs.promises.readFile('./setting.json')

        .then((response) => {

            let jsonData = JSON.parse(response);

            return jsonData;
        })

        .catch((err) => { console.log('error:', err); });




    //console.log(jsonData);




    const xcsrf = ToStrKillQuote(jsonData["headers"]["cookie"]).match(/(?<=ct0=).+?(?=;)/)[0];

    //for headers type cookie (?<=ct0=).+?(?=;)
    //for netscape (?<=ct0\s).+?(?=\n\.)

    //console.log(xcsrf);

    const axiosConfig = {

        "headers": {
            "authorization": ToStrKillQuote(jsonData["headers"]["bearer"]),
            "cookie": ToStrKillQuote(jsonData["headers"]["cookie"]),
            "User-Agent": ToStrKillQuote(jsonData["headers"]["User-Agent"]),
            "x-csrf-token": xcsrf,
        },
        "method": "GET"
    }

    const spaceID = jsonData['spaceaccount'][`${whoseSpace}`];



    const today = new Date();

    let currentDateTime =

        today.getFullYear() + '' +

        (today.getMonth() + 1) + '' +

        today.getDate() + '_' +

        today.getHours() + '_' +

        today.getMinutes();



    //  console.log(currentDateTime);


    let passUserId = await axios("https://twitter.com/i/api/fleets/v1/avatar_content?user_ids=" + spaceID + "&only_spaces=true", axiosConfig)
        .then((response) => { return response; })
        .catch((err) => { console.log('error:', err); });


    if (ToStrKillQuote(passUserId["data"]["users"]) === "{}") {

        console.log("Twitter space is not open.");
        return;

    }
    else {

        passUserId = ToStrKillQuote(passUserId["data"]["users"][`${spaceID}`]["spaces"]["live_content"]["audiospace"]["broadcast_id"]);

    }



    let passSpaceId = await axios("https://twitter.com/i/api/graphql/_EftdBmcVsqcEfn1Yp1A7Q/AudioSpaceById?variables=%7B%22id%22%3A%22" + passUserId + "%22%2C%22isMetatagsQuery%22%3Afalse%2C%22withSuperFollowsUserFields%22%3Atrue%2C%22withUserResults%22%3Atrue%2C%22withBirdwatchPivots%22%3Afalse%2C%22withDownvotePerspective%22%3Afalse%2C%22withReactionsMetadata%22%3Afalse%2C%22withReactionsPerspective%22%3Afalse%2C%22withSuperFollowsTweetFields%22%3Atrue%2C%22withReplays%22%3Atrue%2C%22withScheduledSpaces%22%3Atrue%7D", axiosConfig)
        .then((response) => { return response; })
        .catch((err) => { console.log('error:', err); });

    passSpaceId = ToStrKillQuote(passSpaceId["data"]["data"]["audioSpace"]["metadata"]["media_key"]);



    let passSpacem3u8 = await axios("https://twitter.com/i/api/1.1/live_video_stream/status/" + passSpaceId + "?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com", axiosConfig)
        .then((response) => { return response; })
        .catch((err) => { console.log('error:', err); });


    passSpacem3u8 = ToStrKillQuote(passSpacem3u8["data"]["source"]["location"]);

    console.log(passSpacem3u8);
    //  correct m3u8


    console.log(`./${whoseSpace}_${currentDateTime}.m4a`);
    //  ./neko_20211210_14_36.m4a

    let outPutplace = `./${whoseSpace}_${currentDateTime}.m4a`;



    ffmpeg(passSpacem3u8)

        .outputOptions("-c:a copy")

        .outputOptions("-vn")

        .output(outPutplace)

        .on('stderr', function (stderrLine) {
            console.log(stderrLine);
        })

        .run();




}


await TwitterSpace("spaceId");
