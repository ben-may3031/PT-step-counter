/* global L */
declare const L;
import { Component, OnInit } from '@angular/core';

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

  items: Observable<any[]>;
  data: any;

  teamDataSorted: any;
  map: any;
  colourArray: any;
  centreCoordinates: any;
  lineData: any;
  targetDistance: number;
  targetNumberOfStepsForTeam: number;
  maxProgress: number;

  constructor(db: AngularFireDatabase) {
    // Watch for updates in the database and run onUpdate if watch triggered
    this.items = db.list('masterSheet');
    this.items.subscribe(val => this.onUpdate(val));

    // Set the colours associated with the top 10 teams (used for the map and the
    // leaderboard)
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

    // Set GPS coordinates and order for PT centres to be shown on map
    this.centreCoordinates = [
      {coordinates: [51.3923509, 0.5266571], label: 'Chatham Centre'},
      {coordinates: [51.5186418, -0.0853988], label: 'London'},
      {coordinates: [50.8984317, -1.4037609], label: 'Southampton'},
      {coordinates: [51.4525093, -2.5881386], label: 'Bristol'},
      {coordinates: [51.4752889, -3.1558228], label: 'Cardiff'},
      {coordinates: [52.475385, -1.8845159], label: 'Birmingham'},
      {coordinates: [52.9682854, -1.1602592], label: 'Nottingham'},
      {coordinates: [53.3825092, -1.4725113], label: 'Sheffield'},
      {coordinates: [53.4031032, -2.9765692], label: 'Liverpool'},
      {coordinates: [53.4601658, -2.276423], label: 'Manchester'},
      {coordinates: [53.7984933, -1.5454026], label: 'Leeds'},
      {coordinates: [54.5832051, -1.2314987], label: 'Middlesborough'},
      {coordinates: [54.974209, -1.67762], label: 'Newcastle'},
      {coordinates: [55.9747091, -3.1822447], label: 'Edinburgh'},
      {coordinates: [56.4689391, -2.9553223], label: 'Dundee'},
      {coordinates: [55.8542723, -4.2577225], label: 'Glasgow'},
      {coordinates: [54.5919899, -5.9403295], label: 'Belfast'},
    ];

    // Set the distance along the route corresponding to target progress (currently
    // distance to Edinburgh (in GPS coordinate space))
    this.targetDistance = 15.93487645379707;

    // Set the target number of steps for a team
    this.targetNumberOfStepsForTeam = 1680000;

    // Set the maximum progress proportion that can be shown for a team on the map
    // This is set to stop the team markers overshooting the final centre on the route
    this.maxProgress = 1.4263;
  }

  onUpdate(data) {
    // data is an array of arrays, with the first array being an array of headers and
    // all others being an array of values with each element associated with the header
    // having the same index. We are interested in the "Team", "Steps" and "Donation"
    // fields. The indices for these fields are found here using the header array
    const headers = data[0];
    const teamIndex = headers.indexOf('Team');
    const stepIndex = headers.indexOf('Steps');
    const fundIndex = headers.indexOf('Donation');

    // Generate a list of unique and non-blank team names appearing in the data.
    // Note that the header entry is excluded by excluding any value equal to "Team",
    // therefore a team cannot have the name "Team"
    const teamNames = [];
    data.map(x => {
       if (!teamNames.includes(x[teamIndex]) && x[teamIndex] !== 'Team' && x[teamIndex].trim() !== '') {
        teamNames.push(x[teamIndex]);
       }
    });

    // Generate an array of team data, storing the team name, the total amount of steps
    // the team has entered over all database records associated with the team, and the
    // total amount of donations entered over all database records associated with the
    // team
    const teamData = [];
    // Loop over all teams in teamNames
    for (const team of teamNames) {
      teamData.push({
        name: team,
        // Loop over all database records and increment by the number of steps for the
        // record if the team is the team considered in the outer loop
        steps: (function() {
          let stepCounter = 0;
          for (const response of data) {
              if (team === response[teamIndex]) {
                stepCounter = stepCounter + response[stepIndex];
              }
          }
          return stepCounter;
        }()),
        // Loop over all database records and increment by the donation amount for the
        // record if the team is the team considered in the outer loop
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

    // Sort the team data by number of step (descending)
    this.teamDataSorted = teamData.sort((a, b) => b.steps - a.steps);
    // Use the sorted team data to plot the map
    this.renderMap(this.teamDataSorted);
  }

  renderMap(teamDataSorted) {
    // Evaluate the coordinates for the start and end points of all the line sections
    // (joining centres) to be plotted. Evaluate also the route progress for each line end
    // point, where progress is defined as the distance covered on the route up to that
    // point as a proportion of the distance covered to Edinburgh (which is not the last
    // centre on the route, so progress can exceed 1)
    this.lineData = [];
    let cumulativeDistanceCovered = 0;
    // Loop over the array of PT centre coordinates and labels
    this.centreCoordinates.forEach((marker, index) => {
      // Only consider points after the first since we are building a list of start
      // and end points
      if (index > 0) {
        // Set from coordinates as previous point coordinates
        const fromCoords = this.centreCoordinates[index - 1].coordinates;
        // Set to coordinates as current point coordinates
        const toCoords = marker.coordinates;
        // Increment cumulative progress by the length of the line between the from and to
        // coordinates
        cumulativeDistanceCovered += Math.pow(toCoords[0] - fromCoords[0], 2) + Math.pow(toCoords[1] - fromCoords[1], 2);
        // Store from coordinates, to coordinates, and cumulative progress on route up to
        // to coordinates as a proportion of cumulative progress up to Edinburgh
        this.lineData.push({
          fromCoords: fromCoords,
          toCoords: toCoords,
          progress: cumulativeDistanceCovered / this.targetDistance,
        });
      }
    });

    // Evaluate an array of team data, storing the team name, the number of steps
    // the team has entered as a proportion of the steps target capped at this.maxProgress
    // (which is currently the progress along the map route to Belfast, the final centre
    // of the route), and the colour to be associated with the team in the map.
    // The array is set to contain data for the top ten teams by total number of steps
    const progressByTeam = [];
    teamDataSorted.slice(0, 10).forEach((item, index) => {
      progressByTeam.push({
        name: item.name,
        progress: Math.min(this.maxProgress, item.steps / this.targetNumberOfStepsForTeam),
        colour: this.colourArray[index],
      });
    });

    // Evaluate the GPS coordinates (used to plot a team marker) given line data for a map
    // and a (team) progress proportion
    const findTeamCoordinates = (lineData, progress) => {
      const upperIndex = lineData.findIndex(item => item.progress > progress);
      let lowerProgress;
      if (upperIndex === 0) {
        lowerProgress = 0;
      } else {
        lowerProgress = lineData[upperIndex - 1].progress;
      }
      const higherProgress = lineData[upperIndex].progress;
      const sectionLength = higherProgress - lowerProgress;
      const distanceAlongSection = progress - lowerProgress;
      const sectionProgress = distanceAlongSection / sectionLength;
      const diffCoords = [
        lineData[upperIndex].toCoords[0] - lineData[upperIndex].fromCoords[0],
        lineData[upperIndex].toCoords[1] - lineData[upperIndex].fromCoords[1],
      ];
      const scaledCoords = diffCoords.map(item => item * sectionProgress);
      const output = Object.assign({}, lineData[upperIndex].fromCoords);
      scaledCoords.forEach((item, index) => {
        output[index] += item;
      });

      return output;
    };

    const mapUpdate = () => {
      let element;

      if (document.getElementsByClassName('leaflet-container').length > 0) {
        this.map.remove();

        // clear the elements inside of the directive
        d3.select(element).selectAll('*').remove();
      }

      element = document.getElementById('leafletmap');

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
      const svg = d3.select(element).select('svg');
      const g = svg.append('g');

      const startFlag = g.append('text')
        .style('font-family', 'FontAwesome')
        .attr('font-size', '30px')
        .text('\uf11e');

      startFlag.attr('transform', d => 'translate('
        + this.map.latLngToLayerPoint(this.centreCoordinates[0].coordinates).x + ','
        + this.map.latLngToLayerPoint(this.centreCoordinates[0].coordinates).y + ')',
      );

      const endFlag = g.append('text')
        .style('font-family', 'FontAwesome')
        .attr('font-size', '30px')
        .text('\uf11e');

      endFlag.attr('transform', d => 'translate('
        + this.map.latLngToLayerPoint(this.centreCoordinates[13].coordinates).x + ','
        + this.map.latLngToLayerPoint(this.centreCoordinates[13].coordinates).y + ')',
      );

      const endFlag2 = g.append('text')
        .style('font-family', 'FontAwesome')
        .attr('font-size', '30px')
        .text('\uf11e');

      endFlag2.attr('transform', d => 'translate('
        + this.map.latLngToLayerPoint(this.centreCoordinates[16].coordinates).x + ','
        + this.map.latLngToLayerPoint(this.centreCoordinates[16].coordinates).y + ')',
      );

      const lines = g.selectAll('line')
        .data(this.lineData)
        .enter().append('line')
        .attr('x1', d => this.map.latLngToLayerPoint(d.fromCoords).x)
        .attr('x2', d => this.map.latLngToLayerPoint(d.toCoords).x)
        .attr('y1', d => this.map.latLngToLayerPoint(d.fromCoords).y)
        .attr('y2', d => this.map.latLngToLayerPoint(d.toCoords).y)
        .style('stroke-width', 1)
        .style('stroke', 'black');

      const pointsToPlot = [];
      this.centreCoordinates.forEach(item => {
        pointsToPlot.push({
          xCoordinate: this.map.latLngToLayerPoint(item.coordinates).x,
          yCoordinate: this.map.latLngToLayerPoint(item.coordinates).y,
          colour: 'brown',
          label: item.label,
          radius: 4,
        });
      });

      progressByTeam.forEach(item => {
        const teamCoordinates = findTeamCoordinates(this.lineData, item.progress);
        pointsToPlot.push({
          xCoordinate: this.map.latLngToLayerPoint(L.latLng(teamCoordinates[0], teamCoordinates[1])).x,
          yCoordinate: this.map.latLngToLayerPoint(L.latLng(teamCoordinates[0], teamCoordinates[1])).y,
          colour: item.colour,
          label: item.name,
          radius: 6,
        });
      });

      g.selectAll('.circle')
        .data(pointsToPlot)
        .enter().append('circle')
        .style('stroke', 'black')
        .style('opacity', .6)
        .style('fill', d => d.colour)
        .attr('r', d => d.radius)
        .attr('cx', d => d.xCoordinate)
        .attr('cy', d => d.yCoordinate);
    };
    mapUpdate();
  }
}
