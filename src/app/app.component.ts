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

  constructor(db: AngularFireDatabase) {
    this.items = db.list('masterSheet');
    console.log(this.items);
    this.items.subscribe(val => this.onUpdate(val));

  }

  onUpdate(data) {
    const headers = data[0];
    const teamIndex = headers.indexOf('Team');
    const stepIndex = headers.indexOf('Steps');
    const fundIndex = headers.indexOf('Donation');

    const teamNames = [];
    data.map(x => {
       if (!teamNames.includes(x[teamIndex]) && x[teamIndex] !== 'Team') {
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
    console.log('teams:', end);
    this.render();
  }

render() {
  console.log('run');
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

  const progressByTeam = [
    {name: 'Wazoku', progress: 0.75, steps: 75000, colour: 'green'},
    {name: 'HSBC', progress: 0.25, steps: 25000, colour: 'blue'},
  ];

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

  console.log("TEST3");
  console.log(lineData);

  // TODO: finish here
  const findTeamCoordinates = (lineData, progress) => {
    const upperIndex = lineData.findIndex(item => item.progress > progress)
    const lowerProgress = lineData[upperIndex - 1].progress
    const higherProgress = lineData[upperIndex].progress
    const sectionLength = higherProgress - lowerProgress
    const distanceAlongSection = progress - lowerProgress
    const sectionProgress = distanceAlongSection / sectionLength
    const diffCoords = [
      lineData[upperIndex].toCoords[0] - lineData[upperIndex].fromCoords[0],
      lineData[upperIndex].toCoords[1] - lineData[upperIndex].fromCoords[1],
    ]
    const scaledCoords = diffCoords.map(item => item * sectionProgress)
    let output = lineData[upperIndex].fromCoords
    scaledCoords.forEach((item, index) => {
      output[index] += item
    })

    console.log("TEST4")
    console.log(output)

    return output
  }

  // console.log(findTeamCoordinates(lineData, 0.25))

  const getBounds = (coordsInput) => {
    let bounds = [[0, 0], [0, 0]];

    if (coordsInput.length > 0) {
      bounds = [
        [coordsInput[0].coordinates[0], coordsInput[0].coordinates[1]],
        [coordsInput[0].coordinates[0], coordsInput[0].coordinates[1]],
      ];
      coordsInput.forEach(item => {
        if (item.coordinates[0] < bounds[0][0]) {bounds[0][0] = item.coordinates[0]}

        if (item.coordinates[0] > bounds[1][0]) {bounds[1][0] = item.coordinates[0]}

        if (item.coordinates[1] < bounds[0][1]) {bounds[0][1] = item.coordinates[1]}

        if (item.coordinates[1] > bounds[1][1]) {bounds[1][1] = item.coordinates[1]}
      });
    }

    return bounds;
  };

  const mapUpdate = () => {
    if (map) {
      map.remove();
    }

    // clear the elements inside of the directive
    d3.select(element).selectAll('*').remove();

    map = new L.map(element).setView([55, -4], 6);
    const mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; ' + mapLink + ' Contributors',
      // maxZoom: 180,
    }).addTo(map);

    map.scrollWheelZoom.disable();
    map.touchZoom.disable();
    map.dragging.disable();

    // Initialize the SVG layer
    map._initPathRoot();

    // We simply pick up the SVG from the map object
    const svg = d3.select(element).select("svg");
    const g = svg.append("g");

    const outerFeature = g.selectAll("circle")
      .data(newMapData)
      .enter().append("circle")
      .style("stroke", "black")
      .style("opacity", .6)
      .style("fill", "brown")
      .attr("r", d => 6 * Math.sqrt(d.count));

    const teamPoints = g.selectAll("rect")
      .data(progressByTeam)
      .enter().append("rect")
      .style("stroke", "black")
      .style("opacity", .6)
      .style("fill", d => 'green')
      .attr("width", 10)
      .attr("height", 10)

    const defaultStyle = {
      padding: "0px 5px 0px 5px",
      margin: "5px",
      "border-radius": "16px",
      "background-color": "white",
      stroke: "none",
      cursor: "pointer",
    }

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

    // const innerFeature = g.selectAll("circle")
    //   .data(newMapData)
    //   .enter().append("circle")
    //   .style("stroke", "black")
    //   .style("fill", "black")
    //   .attr("r", 2)

    // Add a label.
    const text = g.selectAll("text")
      .data(newMapData)
      .enter().append("text")
      .attr("font-size", "8px")
      .text(d => d.label)

    const update = () => {
      outerFeature.attr("transform", d => "translate("
        + map.latLngToLayerPoint(d.coordinates).x + ","
        + map.latLngToLayerPoint(d.coordinates).y + ")",
      )

      startFlag.attr("transform", d => "translate("
        + map.latLngToLayerPoint(newMapData[0].coordinates).x + ","
        + map.latLngToLayerPoint(newMapData[0].coordinates).y + ")",
      )

      endFlag.attr("transform", d => "translate("
        + map.latLngToLayerPoint(newMapData[13].coordinates).x + ","
        + map.latLngToLayerPoint(newMapData[13].coordinates).y + ")",
      )

      endFlag2.attr("transform", d => "translate("
        + map.latLngToLayerPoint(newMapData[16].coordinates).x + ","
        + map.latLngToLayerPoint(newMapData[16].coordinates).y + ")",
      )

      // innerFeature.attr("transform", d => "translate("
      //   + map.latLngToLayerPoint(d.coordinates).x + ","
      //   + map.latLngToLayerPoint(d.coordinates).y + ")",
      // )
      text.attr("transform", d => "translate("
        + map.latLngToLayerPoint(d.coordinates).x + ","
        + map.latLngToLayerPoint(d.coordinates).y + ")",
      )

      teamPoints.attr("transform", d => "translate("
        + map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).x + ","
        + map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).y + ")",
      )

      const lines = g.selectAll("line")
        .data(lineData)
        .enter().append("line")
        .attr("x1", d => map.latLngToLayerPoint(d.fromCoords).x)
        .attr("x2", d => map.latLngToLayerPoint(d.toCoords).x)
        .attr("y1", d => map.latLngToLayerPoint(d.fromCoords).y)
        .attr("y2", d => map.latLngToLayerPoint(d.toCoords).y)
        .style("stroke-width", 1)
        .style("stroke", "black")

      // const teamPoints = g.selectAll("circle")
      //   .data(progressByTeam)
      //   .enter().append("circle")
      //   .attr("x", d => map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).x)
      //   .attr("y", d => map.latLngToLayerPoint(findTeamCoordinates(lineData, d.progress)).y)
      //   .style("stroke", "black")
      //   .style("opacity", .6)
      //   .style("fill", d => 'green')
      //   .attr("r", 6)
    }

    map.on("viewreset", update)
    update()
  }

  const mapRender = () => {
    map.setView([0, 0], 1)

    const bounds = getBounds(newMapData);

    console.log(bounds);

    map.fitBounds(bounds);
  };

  // scope.$watch('val', (newVal, oldVal) => {
  //   if (newVal) {
  mapUpdate();
  // mapRender()

  setTimeout(() => {
    map.invalidateSize();
  }, 0);


}
}
