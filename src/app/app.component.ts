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

  items: any;
  data: any;

  teamDataSorted: any;
  map: any;
  colourArray: any;
  centreCoordinates: any;
  lineData: any;
  targetGPSDistance: number;
  targetNumberOfStepsForTeam: number;
  maxProgress: number;
  targetCentreIndex: number;
  stepLengthInMetres: number;

  constructor(db: AngularFireDatabase) {
    // Watch for updates in the database and run onUpdate if watch triggered
    this.items = db.list('masterSheet');
    this.items.subscribe(val => this.onUpdate(val));

    // Set the colours associated with the top 10 teams (used for the map and the
    // leaderboard)
    this.colourArray = [
      '#D1BF3B',
      '#979596',
      '#AE822C',
    ];

    // Set GPS coordinates for locations
    this.centreCoordinates = [
      {coordinates: [-41.2923814, 174.7787463], label: 'Wellington'},
      {coordinates: [69.7029321, 170.307033], label: 'Pevek'},
      {coordinates: [31.6688967, 122.1137989], label: 'Shanghai'},
      {coordinates: [20.593684, 78.96288], label: 'India'},
      {coordinates: [42.315407, 43.35689199999999], label: 'Georgia'},
      {coordinates: [42.733883, 25.48583], label: 'Bulgaria'},
      {coordinates: [55.671335, 12.5851452], label: 'Copenhagen'},
      {coordinates: [41.9027835, 12.4963655], label: 'Rome'},
      {coordinates: [50.503887, 4.469936], label: 'Belgium'},
      {coordinates: [52.056736, 1.14822], label: 'Ipswich'},
      {coordinates: [50.9085955, 0.2494166], label: 'East Sussex'},
      {coordinates: [51.509078, -0.085562], label: 'London'},
      {coordinates: [52.370878, -1.265032], label: 'Rugby'},
      {coordinates: [52.48624299999999, -1.890401], label: 'Birmingham'},
      {coordinates: [51.453871, -2.599883], label: 'Bristol'},
      {coordinates: [53.4083714, -2.9915726], label: 'Liverpool'},
      {coordinates: [50.26604709999999, -5.0527125], label: 'Cornwall'},
      {coordinates: [42.4072107, -71.3824374], label: 'Massachusetts'},
      {coordinates: [40.7127753, -74.0059728], label: 'New York'},
      {coordinates: [4.710988599999999, -74.072092], label: 'Bogota'},
      {coordinates: [39.169567, -75.545001], label: 'Delaware'},
      {coordinates: [38.9071923, -77.03687069999999], label: 'Washington DC'},
      {coordinates: [46.729553, -94.6858998], label: 'Minnesota'},
      {coordinates: [31.9685988, -99.9018131], label: 'Texas'},
      {coordinates: [39.5500507, -105.7820674], label: 'Colorado'},
      {coordinates: [61.2180556, -149.9002778], label: 'Anchorage'},
    ];

    this.stepLengthInMetres = 0.65
  }

  onUpdate(data) {
    // data is an array of arrays, with the first array being an array of headers and
    // all others being an array of values with each element associated with the header
    // having the same index. We are interested in the "Team", "Steps" and "Donation"
    // fields. The indices for these fields are found here using the header array
    const headers = data[0];
    const teamIndex = headers.indexOf('Participant');
    const amountIndex = headers.indexOf('Amount');
    const unitIndex = headers.indexOf('Unit');

    // Generate a list of unique and non-blank team names appearing in the data.
    // Note that the header entry is excluded by excluding any value equal to "Team",
    // therefore a team cannot have the name "Team"
    const teamNames = [];
    data.map(x => {
       if (!teamNames.includes(x[teamIndex]) && x[teamIndex] !== 'Participant' && x[teamIndex].trim() !== '') {
        teamNames.push(x[teamIndex]);
       }
    });

    const stepLengthInMetres = this.stepLengthInMetres

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
                if (response[unitIndex] == 'Steps') {
                  stepCounter += response[amountIndex]
                } else if (response[unitIndex] == 'Kilometres') {
                  stepCounter += 1000 * response[amountIndex] / stepLengthInMetres
                } else if (response[unitIndex] == 'Miles') {
                  stepCounter += (1000 / 0.621371) * response[amountIndex] / stepLengthInMetres
                }
              }
          }
          return stepCounter;
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
        cumulativeDistanceCovered += Math.sqrt(Math.pow(toCoords[0] - fromCoords[0], 2) + Math.pow(toCoords[1] - fromCoords[1], 2));
        // Store from coordinates, to coordinates, and cumulative progress on route up to
        // to coordinates as a proportion of cumulative progress up to Edinburgh
        this.lineData.push({
          fromCoords: fromCoords,
          toCoords: toCoords,
          progress: cumulativeDistanceCovered / this.targetGPSDistance,
        });

        if (index = this.centreCoordinates.length - 1) {
          // Set the maximum progress proportion that can be shown for a team on the map
          // This is set to stop the team markers overshooting the final centre on the route
          this.maxProgress = cumulativeDistanceCovered / this.targetGPSDistance;
        }
      }
    });

    // Evaluate an array of team data, storing the team name, the number of steps
    // the team has entered as a proportion of the steps target capped at this.maxProgress
    // (which is currently the progress along the map route to Belfast, the final centre
    // of the route), and the colour to be associated with the team in the map.
    // The array is set to contain data for the top ten teams by total number of steps
    let stepsSum = 0;

    teamDataSorted.forEach((item, index) => {
      stepsSum += item.steps
    })

    const progressByTeam = [{
      name: 'Team Wazoku',
      progress: Math.min(this.maxProgress, stepsSum / this.targetNumberOfStepsForTeam),
      colour: '#080A27',
    }]

    // Evaluate the GPS coordinates (used to plot a team marker) given line data for a map
    // and a (team) progress proportion
    const findTeamCoordinates = (lineData, progress) => {
      // Find the index of the lineData element having progress greater than or equal to
      // the team progress (argument), then find the progress at the to and from points for the
      // corresponding lineData element (with the from progress found from the previous
      // lineData element or set to 0 if no previous).
      const upperIndex = lineData.findIndex(item => item.progress >= progress);
      let lowerProgress;
      if (upperIndex === 0) {
        lowerProgress = 0;
      } else {
        lowerProgress = lineData[upperIndex - 1].progress;
      }
      const higherProgress = lineData[upperIndex].progress;

      // The team progress will be between of equal to the two progresses found, so
      // the team point should be plotted beteen the two lineData point coordinates.
      // The proportion along the line the team point should be plotted is the difference
      // between the team progress and the from point progress as a proportion of the
      // difference betwen the to and from point progresses. This proportion is found,
      // along with the corresponding team coordinates, in the following.
      const sectionLength = higherProgress - lowerProgress;
      const distanceAlongSection = progress - lowerProgress;
      // Evaluate team progress proportion along line section
      const sectionProgress = distanceAlongSection / sectionLength;
      // Evaluate vector for difference between to and from coordinates
      const diffCoords = [
        lineData[upperIndex].toCoords[0] - lineData[upperIndex].fromCoords[0],
        lineData[upperIndex].toCoords[1] - lineData[upperIndex].fromCoords[1],
      ];
      // Scale the difference vector by the line section progress proportion for the team
      const scaledCoords = diffCoords.map(item => item * sectionProgress);
      // Add the scaled difference vector to the lineData from coordinates to find the
      // team coordinates
      const output = Object.assign({}, lineData[upperIndex].fromCoords);
      scaledCoords.forEach((item, index) => {
        output[index] += item;
      });

      return output;
    };

    // Function used to plot the map, including start and end flags, centre points, route
    // lines and team points
    const mapUpdate = () => {
      let element;

      // If a map container exists then remove the map and it's contents
      if (document.getElementsByClassName('leaflet-container').length > 0) {
        this.map.remove();

        // clear the elements inside of the directive
        d3.select(element).selectAll('*').remove();
      }

      // Initialize the map (using Leaflet) with centre and zoom suitable to show UK map
      element = document.getElementById('leafletmap');
      this.map = new L.map(element).setView([40.91, 0], 2);
      const mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; ' + mapLink + ' Contributors',
      }).addTo(this.map);
      // Disable map scrolling, zooming and dragging
      this.map.scrollWheelZoom.disable();
      this.map.touchZoom.disable();
      this.map.dragging.disable();
      this.map.doubleClickZoom.disable();
      this.map.boxZoom.disable();
      this.map.keyboard.disable();
      this.map.removeControl(this.map.zoomControl);
      // Initialize the SVG layer
      this.map._initPathRoot();
      // We simply pick up the SVG from the map object
      const svg = d3.select(element).select('svg');
      const g = svg.append('g');

      // Plot start flag at SVG origin (using font awesome flag icon)
      const startFlag = g.append('text')
        .style('font-family', 'FontAwesome')
        .attr('font-size', '30px')
        .text('\uf024');

      // Shift start flag to location of first centre of route
      startFlag.attr('transform', d => 'translate('
        + this.map.latLngToLayerPoint(this.centreCoordinates[0].coordinates).x + ','
        + this.map.latLngToLayerPoint(this.centreCoordinates[0].coordinates).y + ')',
      );

      // Plot second end flag at SVG origin (using font awesome flag icon)
      const endFlag2 = g.append('text')
        .style('font-family', 'FontAwesome')
        .attr('font-size', '30px')
        .text('\uf11e');

      // Shift second end flag to location of last centre of route
      const lastCentreIndex = this.centreCoordinates.length - 1;
      endFlag2.attr('transform', d => 'translate('
        + this.map.latLngToLayerPoint(this.centreCoordinates[lastCentreIndex].coordinates).x + ','
        + this.map.latLngToLayerPoint(this.centreCoordinates[lastCentreIndex].coordinates).y + ')',
      );

      // Plot the line sections (using this.lineData)
      const lines = g.selectAll('line')
        .data(this.lineData)
        .enter().append('line')
        .attr('x1', d => this.map.latLngToLayerPoint(d.fromCoords).x)
        .attr('x2', d => this.map.latLngToLayerPoint(d.toCoords).x)
        .attr('y1', d => this.map.latLngToLayerPoint(d.fromCoords).y)
        .attr('y2', d => this.map.latLngToLayerPoint(d.toCoords).y)
        .style('stroke-width', 1)
        .style('stroke', 'black');

      // Find the SVG coordinates (using GPS coordinates) for the centre points
      // Also, set the colour and radii for the points
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

      // Find the SVG coordinates (using GPS coordinates) for the team points
      // Also, set the colour and radii for the points
      progressByTeam.forEach(item => {
        const teamCoordinates = findTeamCoordinates(this.lineData, item.progress);
        pointsToPlot.push({
          xCoordinate: this.map.latLngToLayerPoint(L.latLng(teamCoordinates[0], teamCoordinates[1])).x,
          yCoordinate: this.map.latLngToLayerPoint(L.latLng(teamCoordinates[0], teamCoordinates[1])).y,
          colour: item.colour,
          label: item.name,
          radius: 10,
        });
      });

      // Plot team and centre points
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

    // Call function to plot map
    mapUpdate();
  }

  getDistanceBetweenLocations(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  }

  getGPSDistanceBetweenLocations(lat1, lon1, lat2, lon2) {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2))
  }

  ngOnInit() {
    let numberOfMetresToTravel = 0
    this.targetGPSDistance = 0

    this.centreCoordinates.forEach((item, index) => {
      if (index > 0) {
        numberOfMetresToTravel += this.getDistanceBetweenLocations(
          this.centreCoordinates[index - 1].coordinates[0],
          this.centreCoordinates[index - 1].coordinates[1],
          item.coordinates[0],
          item.coordinates[1],
        )

        this.targetGPSDistance += this.getGPSDistanceBetweenLocations(
          this.centreCoordinates[index - 1].coordinates[0],
          this.centreCoordinates[index - 1].coordinates[1],
          item.coordinates[0],
          item.coordinates[1],
        )
      }
    })

    // Set the target number of steps for a team
    this.targetNumberOfStepsForTeam = numberOfMetresToTravel / this.stepLengthInMetres;
  }
}
