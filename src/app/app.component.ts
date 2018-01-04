/* global L */
declare const L;
import { Component, OnInit } from '@angular/core';

// import { AngularFireDatabase } from 'angularfire2/database';
import { AngularFireModule } from 'angularfire2';
import { AngularFireDatabase, FirebaseListObservable, FirebaseObjectObservable } from 'angularfire2/database-deprecated';

import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase/app';

import * as d3 from 'd3';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  requiredSteps = 1680000;

  items: Observable<any[]>;
  data: any;

  teams: any;
  map: any;
  colourArray: any;

  constructor(db: AngularFireDatabase) {
    this.items = db.list('masterSheet');
    console.log(this.items);
    this.items.subscribe(val => this.onUpdate(val));
    this.colourArray = [
      '#49C8F7',
      '#FF6E5B',
      '#EDAB72',
      '#7F73CA',
      '#E36F86',
      '#2976A3',
      '#17A152',
      '#ECD771',
      '#A7CC4C',
      '#2FCBC1',
    ];
  }

  // compareSteps(a,b) {
  //   console.log("TESTER12233")
  //   if (a.steps < b.steps)
  //     return -1;
  //   if (a.steps > b.steps)
  //     return 1;
  //   return 0;
  // }

  onUpdate(data) {
    const headers = data[0];
    const teamIndex = headers.indexOf('Team');
    const stepIndex = headers.indexOf('Steps');
    const fundIndex = headers.indexOf('Donation');

    const teamNames = [];
    data.map(x => {
       if (!teamNames.includes(x[teamIndex]) && x[teamIndex] !== 'Team' && x[teamIndex].trim() !== '') {
        teamNames.push(x[teamIndex]);
       }
    });
    const teamSteps = [];
    const end = [];

    for (const team of teamNames) {
      end.push({
        name: team,
        steps: (function() {
          let stepCounter = 0;
          for (const response of data) {
              if (team === response[teamIndex]) {
                stepCounter = stepCounter + response[stepIndex];
              }
          }
          return stepCounter;
        }()),
        funds: (function() {
          let fundCounter = 0;
          for (const response of data) {
            if (team === response[teamIndex]) {
              fundCounter = fundCounter + response[fundIndex];
            }
          }
          return fundCounter;
        }()),
      });
    }

    // let end = [
    //   {name: "Team 1", steps: 4000000, funds: 999},
    //   {name: "Team 2", steps: 3000000, funds: 888},
    //   {name: "Team 3", steps: 1680000, funds: 777},
    //   {name: "Team 4", steps: 950000, funds: 666},
    //   {name: "Team 5", steps: 900000, funds: 555},
    //   {name: "Team 6", steps: 800000, funds: 444},
    //   {name: "Team 7", steps: 500000, funds: 333},
    //   {name: "Team 8", steps: 400000, funds: 222},
    //   {name: "Team 9", steps: 200000, funds: 111},
    //   {name: "Team 10", steps: 100000, funds: 2},
    //   {name: "Team 11", steps: 50000, funds: 1},
    // ]

    this.teams = end.sort((a, b) => b.steps - a.steps);
    this.render(this.teams);
  }

render(end) {
  let map;
  let center;
  const dataset = {};
  const element = document.getElementById('leafletmap');

  const newMapData = [
    {count: 1, coordinates: [51.3923509, 0.5266571], label: 'Chatham Centre'},
    {count: 1, coordinates: [51.5186418, -0.0853988], label: 'London'},
    {count: 1, coordinates: [50.8984317, -1.4037609], label: 'Southampton'},
    {count: 1, coordinates: [51.4525093, -2.5881386], label: 'Bristol'},
    {count: 1, coordinates: [51.4752889, -3.1558228], label: 'Cardiff'},
    {count: 1, coordinates: [52.475385, -1.8845159], label: 'Birmingham'},
    {count: 1, coordinates: [52.9682854, -1.1602592], label: 'Nottingham'},
    {count: 1, coordinates: [53.3825092, -1.4725113], label: 'Sheffield'},
    {count: 1, coordinates: [53.4031032, -2.9765692], label: 'Liverpool'},
    {count: 1, coordinates: [53.4601658, -2.276423], label: 'Manchester'},
    {count: 1, coordinates: [53.7984933, -1.5454026], label: 'Leeds'},
    {count: 1, coordinates: [54.5832051, -1.2314987], label: 'Middlesborough'},
    {count: 1, coordinates: [54.974209, -1.67762], label: 'Newcastle'},
    {count: 1, coordinates: [55.9747091, -3.1822447], label: 'Edinburgh'},
    {count: 1, coordinates: [56.4689391, -2.9553223], label: 'Dundee'},
    {count: 1, coordinates: [55.8542723, -4.2577225], label: 'Glasgow'},
    {count: 1, coordinates: [54.5919899, -5.9403295], label: 'Belfast'},
  ];

  const progressByTeam = []
  end.slice(0, 10).forEach((item, index) => {
    progressByTeam.push({
      name: item.name,
      progress: Math.min(1.4263, item.steps / 1680000),
      colour: this.colourArray[index],
    })
  })

  const lineData = [];
  let progress = 0;
  newMapData.forEach((marker, index) => {
    if (index > 0) {
      const fromCoords = newMapData[index - 1].coordinates;
      const toCoords = marker.coordinates;
      progress += Math.pow(toCoords[0] - fromCoords[0], 2) + Math.pow(toCoords[1] - fromCoords[1], 2)
      lineData.push({
        fromCoords: fromCoords,
        toCoords: toCoords,
        progress: progress / 15.93487645379707,
      });
    }
  });

  const findTeamCoordinates = (lineData, progress) => {
    const upperIndex = lineData.findIndex(item => item.progress > progress)
    let lowerProgress
    if (upperIndex === 0) {
      lowerProgress = 0
    } else {
      lowerProgress = lineData[upperIndex - 1].progress
    }
    const higherProgress = lineData[upperIndex].progress
    const sectionLength = higherProgress - lowerProgress
    const distanceAlongSection = progress - lowerProgress
    const sectionProgress = distanceAlongSection / sectionLength
    const diffCoords = [
      lineData[upperIndex].toCoords[0] - lineData[upperIndex].fromCoords[0],
      lineData[upperIndex].toCoords[1] - lineData[upperIndex].fromCoords[1],
    ]
    const scaledCoords = diffCoords.map(item => item * sectionProgress)
    let output = Object.assign({}, lineData[upperIndex].fromCoords)
    scaledCoords.forEach((item, index) => {
      output[index] += item
    })

    return output
  }

  // const getPointsToPlot = (newMapData, progressByTeam, map) => {
  //   pointsToPlot = []
  //   newMapData.forEach(item => {
  //     pointsToPlot.push({
  //       xCoordinate: map.latLngToLayerPoint(item.coordinates).x,
  //       yCoordinate: map.latLngToLayerPoint(item.coordinates).y,
  //       colour: 'brown',
  //       label: item.label,
  //     });
  //   });
  //
  //   progressByTeam.forEach(item => {
  //     pointsToPlot.push({
  //       xCoordinate: map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).x,
  //       yCoordinate: map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).y,
  //       colour: item.colour,
  //       label: item.name,
  //     });
  //   });
  //
  //   return pointsToPlot
  // }

  // console.log(findTeamCoordinates(lineData, 0.25))

  // const getBounds = (coordsInput) => {
  //   let bounds = [[0, 0], [0, 0]];
  //
  //   if (coordsInput.length > 0) {
  //     bounds = [
  //       [coordsInput[0].coordinates[0], coordsInput[0].coordinates[1]],
  //       [coordsInput[0].coordinates[0], coordsInput[0].coordinates[1]],
  //     ];
  //     coordsInput.forEach(item => {
  //       if (item.coordinates[0] < bounds[0][0]) {bounds[0][0] = item.coordinates[0]}
  //
  //       if (item.coordinates[0] > bounds[1][0]) {bounds[1][0] = item.coordinates[0]}
  //
  //       if (item.coordinates[1] < bounds[0][1]) {bounds[0][1] = item.coordinates[1]}
  //
  //       if (item.coordinates[1] > bounds[1][1]) {bounds[1][1] = item.coordinates[1]}
  //     });
  //   }
  //
  //   return bounds;
  // };

  const mapUpdate = () => {
    if (document.getElementsByClassName("leaflet-container").length > 0) {
      this.map.remove();

      // clear the elements inside of the directive
      d3.select(element).selectAll('*').remove();
    }

    this.map = new L.map(element).setView([55, -4], 6);
    const mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; ' + mapLink + ' Contributors',
      // maxZoom: 180,
    }).addTo(this.map);

    this.map.scrollWheelZoom.disable();
    this.map.touchZoom.disable();
    this.map.dragging.disable();

    // Initialize the SVG layer
    this.map._initPathRoot();

    // We simply pick up the SVG from the map object
    const svg = d3.select(element).select("svg");
    const g = svg.append("g");

    // const teamPoints = g.selectAll(".rect")
    //   .data(progressByTeam)
    //   .enter().append("rect")
    //   .style("stroke", "black")
    //   .style("opacity", .6)
    //   .style("fill", 'green')
    //   .attr("width", 10)
    //   .attr("height", 10)
    //
    // teamPoints.attr("transform", d => "translate("
    //   + map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).x + ","
    //   + map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).y + ")",
    // )


    // outerFeature.attr("transform", d => "translate("
    //   + map.latLngToLayerPoint(d.coordinates).x + ","
    //   + map.latLngToLayerPoint(d.coordinates).y + ")",
    // )

    // const defaultStyle = {
    //   padding: "0px 5px 0px 5px",
    //   margin: "5px",
    //   "border-radius": "16px",
    //   "background-color": "white",
    //   stroke: "none",
    //   cursor: "pointer",
    // }

    const startFlag = g.append('text')
      .style('font-family', 'FontAwesome')
      .attr("font-size", "30px")
      .text('\uf11e')

    const endFlag = g.append('text')
      .style('font-family', 'FontAwesome')
      .attr("font-size", "30px")
      .text('\uf11e')

    const endFlag2 = g.append('text')
      .style('font-family', 'FontAwesome')
      .attr("font-size", "30px")
      .text('\uf11e')

      startFlag.attr("transform", d => "translate("
        + this.map.latLngToLayerPoint(newMapData[0].coordinates).x + ","
        + this.map.latLngToLayerPoint(newMapData[0].coordinates).y + ")",
      );

      endFlag.attr("transform", d => "translate("
        + this.map.latLngToLayerPoint(newMapData[13].coordinates).x + ","
        + this.map.latLngToLayerPoint(newMapData[13].coordinates).y + ")",
      );

      endFlag2.attr("transform", d => "translate("
        + this.map.latLngToLayerPoint(newMapData[16].coordinates).x + ","
        + this.map.latLngToLayerPoint(newMapData[16].coordinates).y + ")",
      );

    // const innerFeature = g.selectAll("circle")
    //   .data(newMapData)
    //   .enter().append("circle")
    //   .style("stroke", "black")
    //   .style("fill", "black")
    //   .attr("r", 2)

    // // Add a label.
    // const text = g.selectAll("text")
    //   .data(newMapData)
    //   .enter().append("text")
    //   .attr("font-size", "8px")
    //   .text(d => d.label)

    const lines = g.selectAll("line")
      .data(lineData)
      .enter().append("line")
      .attr("x1", d => this.map.latLngToLayerPoint(d.fromCoords).x)
      .attr("x2", d => this.map.latLngToLayerPoint(d.toCoords).x)
      .attr("y1", d => this.map.latLngToLayerPoint(d.fromCoords).y)
      .attr("y2", d => this.map.latLngToLayerPoint(d.toCoords).y)
      .style("stroke-width", 1)
      .style("stroke", "black")

    const pointsToPlot = []
    newMapData.forEach(item => {
      pointsToPlot.push({
        xCoordinate: this.map.latLngToLayerPoint(item.coordinates).x,
        yCoordinate: this.map.latLngToLayerPoint(item.coordinates).y,
        colour: 'brown',
        label: item.label,
        radius: 4,
      });
    });

    progressByTeam.forEach(item => {
      const teamCoordinates = findTeamCoordinates(lineData, item.progress)
      pointsToPlot.push({
        xCoordinate: this.map.latLngToLayerPoint(L.latLng(teamCoordinates[0], teamCoordinates[1])).x,
        yCoordinate: this.map.latLngToLayerPoint(L.latLng(teamCoordinates[0], teamCoordinates[1])).y,
        colour: item.colour,
        label: item.name,
        radius: 6,
      });
    });

    const outerFeature = g.selectAll(".circle")
      .data(pointsToPlot)
      .enter().append("circle")
      .style("stroke", "black")
      .style("opacity", .6)
      .style("fill", d => d.colour)
      .attr("r", d => d.radius)
      .attr("cx", d => d.xCoordinate)
      .attr("cy", d => d.yCoordinate)


    // const update = () => {
    //   outerFeature.attr("transform", d => "translate("
    //     + map.latLngToLayerPoint(d.coordinates).x + ","
    //     + map.latLngToLayerPoint(d.coordinates).y + ")",
    //   )
    //
    //
    //   // innerFeature.attr("transform", d => "translate("
    //   //   + map.latLngToLayerPoint(d.coordinates).x + ","
    //   //   + map.latLngToLayerPoint(d.coordinates).y + ")",
    //   // )
    //   text.attr("transform", d => "translate("
    //     + map.latLngToLayerPoint(d.coordinates).x + ","
    //     + map.latLngToLayerPoint(d.coordinates).y + ")",
    //   )
    //
    //   teamPoints.attr("transform", d => "translate("
    //     + map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).x + ","
    //     + map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).y + ")",
    //   )
    //
    //   const lines = g.selectAll("line")
    //     .data(lineData)
    //     .enter().append("line")
    //     .attr("x1", d => map.latLngToLayerPoint(d.fromCoords).x)
    //     .attr("x2", d => map.latLngToLayerPoint(d.toCoords).x)
    //     .attr("y1", d => map.latLngToLayerPoint(d.fromCoords).y)
    //     .attr("y2", d => map.latLngToLayerPoint(d.toCoords).y)
    //     .style("stroke-width", 1)
    //     .style("stroke", "black")
    //
    //   // const teamPoints = g.selectAll("circle")
    //   //   .data(progressByTeam)
    //   //   .enter().append("circle")
    //   //   .attr("x", d => map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).x)
    //   //   .attr("y", d => map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).y)
    //   //   .style("stroke", "black")
    //   //   .style("opacity", .6)
    //   //   .style("fill", d => 'green')
    //   //   .attr("r", 6)
    // }

    // map.on("viewreset", update)
    // update()
  }

  // const mapRender = () => {
  //   map.setView([0, 0], 1)
  //
  //   const bounds = getBounds(newMapData);
  //
  //   console.log(bounds);
  //
  //   map.fitBounds(bounds);
  // };

  // scope.$watch('val', (newVal, oldVal) => {
  //   if (newVal) {
  mapUpdate();
  // mapRender()

  setTimeout(() => {
    this.map.invalidateSize();
  }, 0);


}
}
