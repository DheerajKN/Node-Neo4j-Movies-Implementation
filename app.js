const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const neo4j = require("neo4j-driver").v1;

const app = express();

// Learn these
//Breaking controllers into multiple files

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "public")));

var driver = neo4j.driver(
  "bolt://localhost",
  neo4j.auth.basic(process.env.neo4jUser, process.env.neo4jPassword)
);
var session = driver.session();

app.get("/movie/:name", (req, res) => {
  const name = req.params.name;
  session
    .run(
      "MATCH(m:Movie {title: {nameParam}})-[r:ACTED_IN]-(a:Actor), (m)-[u:DIRECTED]-(d:Director) RETURN m,collect(a),d",
      { nameParam: name }
    )
    .then(result => {
      res.render("movie", {
        actorsList: result.records[0]._fields[1].map(item => {
          return item.properties.name;
        }),
        directorsList: result.records[0]._fields[2].properties.name,
        title: result.records[0]._fields[0].properties.title,
        year: result.records[0]._fields[0].properties.year,
        endpoint: process.env.endpoint
      });
    })
    .catch(err => {
      console.log(err);
    });
});

app.get("/actor/:name", (req, res) => {
  const name = req.params.name;
  session
    .run(
      "MATCH(n:Actor {name: {nameParam}})-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Director) RETURN n,m,d LIMIT 3",
      { nameParam: name }
    )
    .then(result => {
      const actorInfoList = [];
      result.records.forEach(record => {
        actorInfoList.push({
          directorName: record._fields[2].properties.name,
          movieName: record._fields[1].properties.title
        });
      });
      res.render("actor", {
        name,
        endpoint: process.env.endpoint,
        actorInfo: actorInfoList
      });
    });
});

app.get("/director/:name", (req, res) => {
  const name = req.params.name;
  session
    .run(
      "MATCH(d:Director {name: {nameParam}})-[:DIRECTED]->(m:Movie)<-[:ACTED_IN]-(n:Actor) RETURN collect(n),m,d LIMIT 3",
      { nameParam: name }
    )
    .then(result => {
      const directorInfoList = [];
      result.records.forEach(record => {
        directorInfoList.push({
          actorName: record._fields[0].map(item => {
            return item.properties.name;
          }),
          movieName: record._fields[1].properties.title
        });
      });
      // var output = [];

      // directorInfoList.forEach(function(item) {
      //   var existing = output.filter(function(v, i) {
      //     return v.movieName == item.movieName;
      //   });
      //   if (existing.length) {
      //     var existingIndex = output.indexOf(existing[0]);
      //     output[existingIndex].actorName = output[
      //       existingIndex
      //     ].actorName.concat(item.actorName);
      //   } else {
      //     item.actorName = [item.actorName];
      //     output.push(item);
      //   }
      // });
      //console.log(output);

      res.render("director", {
        directorInfo: directorInfoList,
        name,
        endpoint: process.env.endpoint
      });
    });
});

app.get("/", (req, res) => {
  session
    .run("MATCH(n:Movie) RETURN n LIMIT 25")
    .then(result => {
      var movieArr = [];
      result.records.forEach(record => {
        movieArr.push({
          id: record._fields[0].identity.id,
          title: record._fields[0].properties.title,
          year: record._fields[0].properties.year
        });
      });

      session
        .run("MATCH(n:Actor) RETURN n LIMIT 25")
        .then(result2 => {
          var actorArr = [];
          result2.records.forEach(record => {
            actorArr.push({
              id: record._fields[0].identity.id,
              name: record._fields[0].properties.name
            });
          });

          session
            .run("MATCH(n:Director) RETURN n LIMIT 25")
            .then(result3 => {
              var directorArr = [];
              result3.records.forEach(record => {
                directorArr.push({
                  id: record._fields[0].identity.id,
                  name: record._fields[0].properties.name
                });
              });
              res.render("index", {
                movies: movieArr,
                actors: actorArr,
                directors: directorArr,
                endpoint: process.env.endpoint
              });
            })
            .catch(err => {
              console.log(err);
            });
        })
        .catch(err => {
          console.log(err);
        });
    })
    .catch(err => {
      console.log(err);
    });
});

app.listen(process.env.PORT);
console.log(`PORT started in ${process.env.PORT}`);

module.exports = app;
