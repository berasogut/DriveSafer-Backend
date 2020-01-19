const express = require("express");
const app = express();
var cors = require("cors");

var admin = require("firebase-admin");
var rp = require("request-promise");

function addTask(t) {
  this.totalDur += t.dur;
  this.lastDropOff = t.to;
  this.queue.push(t);
}
var seconds = new Date().getTime() / 60000;
const cars = [
  {
    id: 0,
    availableSeats: 3,
    totalDur: 0,
    lastDropOff: "456 Sherbrooke West, QC",
    addTask,
    queue: [],
    lastTime: seconds
  },
  {
    id: 1,
    availableSeats: 5,
    totalDur: 0,
    lastDropOff: "456 Sherbrooke West, QC",
    addTask,
    queue: [],
    lastTime: seconds
  },
  {
    id: 2,
    availableSeats: 3,
    totalDur: 0,
    lastDropOff: "456 Sherbrooke West, QC",
    addTask,
    queue: [],
    lastTime: seconds
  },
  {
    id: 3,
    availableSeats: 5,
    totalDur: 0,
    lastDropOff: "456 Sherbrooke West, QC",
    addTask,
    queue: [],
    lastTime: seconds
  }
];
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.info(req.method, req.originalUrl);
  next();
});

app.get("/", function(req, res) {
  res.send("Hello World");
});

function getDuration(from, to) {
  if (!from || !to) {
    return Promise.reject({ error: "must specify to or from" });
  } else {
    var options = {
      uri: "https://maps.googleapis.com/maps/api/distancematrix/json",
      qs: {
        units: "imperial",
        origins: from,
        destinations: to,
        key: "AIzaSyAFxV-PWjObeqarsnfmSBS0ShmsLWNktuE"
      },
      json: true // Automatically parses the JSON string in the response
    };
    //json.rows[0].elements[0].duration.text);

    return rp(options)
      .then(json => Math.floor(json.rows[0].elements[0].duration.value / 60))
      .catch(function(err) {
        // API call failed...
        throw err;
      });
  }
}

function assignTask(t) {
  return Promise.all(
    cars.map(car => getDuration(car.lastDropOff, t.from))
  ).then(res => {
    min = Number.MAX_SAFE_INTEGER;
    minIdx = -1;

    for (let i = 0; i < res.length; i++) {
      var seconds = new Date().getTime() / 60000;
      var timePast = seconds - cars[i].lastTime;
      while (
        cars[i].queue.length > 0 &&
        timePast >=
          cars[i].queue[0].dur + cars[i].queue[0].durationOfLastDeleted
      ) {
        timePast -=
          cars[i].queue[0].dur + cars[i].queue[0].durationOfLastDeleted;
        cars[i].totalDur -=
          cars[i].queue[0].dur + cars[i].queue[0].durationOfLastDeleted;
        cars[i].queue.shift();
      }
      cars[i].lastTime = seconds - timePast;
      if (
        t.numOfPeople <= cars[i].availableSeats &&
        min > res[i] + cars[i].totalDur
      ) {
        min = res[i] + cars[i].totalDur;
        minIdx = i;
      }
    }
    t.durationOfLastDeleted = res[minIdx];
    cars[minIdx].addTask(t);
    cars[minIdx].totalDur += res[minIdx];
    return [min, minIdx];
  });
}

app.post("/createTask", (req, res) => {
  const {
    origin: from,
    destination: to,
    numPassengers: numOfPeople
  } = req.body;
  getDuration(from, to)
    .then(function(dur) {
      assignTask({ from, to, dur, numOfPeople }).then(([pickupETA, minIdx]) => {
        res.json({
          pickupETA: pickupETA + " min",
          dropoffETA: pickupETA + dur + " min",
          queue: cars[minIdx].queue
        });
      });
    })
    .catch(function(err) {
      res.status(400).json({ error: err.message });
    });
});

//app.post("/Assign");

app.listen(3000);
