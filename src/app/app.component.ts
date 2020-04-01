import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { latLng, LatLng, tileLayer, circle, polygon, LatLngBoundsExpression, LatLngTuple, icon } from 'leaflet';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {

	constructor (private http:HttpClient) { }

	title = 'leaflet-angular';

	currentZoom = 7;
	currentCenter = new LatLng(2.901275, 101.651944);
	currentBounds:LatLngBoundsExpression = [[2.900169, 101.650864],[2.902380, 101.653024]];

	currentLat = this.currentCenter.lat;
	currentLng = this.currentCenter.lng;

	osmLayerUrl = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
	
	leaftletOptions = {
		layers: [ 
		tileLayer(this.osmLayerUrl, { attribution: "Open Street Map" }),
		 ],
		zoom: this.currentZoom,
		center: this.currentCenter,
		detectRetina: true,
		maxZoom: 23,
		minZoom: 13
	};

	// https://aerodyne-marriott-sites.s3.amazonaws.com/Memphis+Airport/Process+Data/ortho/Maptiler/

	layersControl = {
		baseLayers: {
			'RGB' : tileLayer('https://aerodyne-solar.s3.us-east-2.amazonaws.com/Maptiler+200ft/{z}/{x}/{y}.png',{
				minZoom: 10,
				maxNativeZoom: 22,
				maxZoom: 23,
				noWrap: true,
				bounds: this.currentBounds,
				attribution: '<div id="credits" style="display:inline">Aerodyne Campus, Cyberjaya, Selangor, Malaysia. | Aerial Imagery &copy; Aerodyne | Made By Aerodyne </div>'
			}),
			'Thermal' : tileLayer('https://aerodyne-solar.s3.us-east-2.amazonaws.com/maptiler+thermal/{z}/{x}/{y}.png',{
				minZoom: 10,
				maxNativeZoom: 22,
				maxZoom: 23,
				noWrap: true,
				bounds: this.currentBounds,
				attribution: '<div id="credits" style="display:inline">Aerodyne Campus, Cyberjaya, Selangor, Malaysia. | Aerial Imagery &copy; Aerodyne | Made By Aerodyne </div>'
			})
		}
	};

	drawOptions = {
		position: 'topleft',
		draw: {
			marker: {
				icon: icon({
					iconSize: [ 32, 40 ],
					iconAnchor: [ 16, 40 ],
					iconUrl: 'assets/images/map-marker-icon-green@2x.png'
				})
			},
			polyline: true,
			circle: {
				shapeOptions: {
					color: '#aaaaaa'
				}
			}
		}
	};

	DATA_LOADED:boolean = false;

	ngOnInit () {
		this.readMaptilerSource("https://aerodyne-solar.s3.us-east-2.amazonaws.com/Maptiler+200ft/openlayers.html");
	}

	onCenterChange(center: LatLng) {
		setTimeout(() => {
			this.currentLat = this.currentCenter.lat;
			this.currentLng = this.currentCenter.lng;
		});
	}

	onZoomChange(zoom: number) {
		setTimeout(() => {
			this.currentZoom = zoom;
			console.log("Current Zoom: ", this.currentZoom);
		});
	}

	readMaptilerSource (url:string) {
		const options = {
			headers: new HttpHeaders({
				"Access-Control-Allow-Origin" : "*"
			})
		};
		
		this.http.get(url, { responseType: "text" }).subscribe(response => {
			
			const htmlStr:string = response.replace(/(\r\n|\n|\r)/gm,"");

			console.log("HTML STR: ", htmlStr);

			const boundsStripStr1:string = "transformExtent(";
			const boundsStripStr2:string = ", 'EPSG:4326";

			let processBound1 = htmlStr.substring(htmlStr.indexOf(boundsStripStr1), htmlStr.indexOf(boundsStripStr2));
			let processBound2 = processBound1.split(boundsStripStr1).join("");

			let boundsArr = JSON.parse(processBound2);
			let boundsLat1 = boundsArr[1]; // bounds array from openlayer is reversed [Lng,Lat], so we flip it here
			let boundsLng1 = boundsArr[0]; // bounds array from openlayer is reversed [Lng,Lat], so we flip it here
			let boundsLat2 = boundsArr[3]; // bounds array from openlayer is reversed [Lng,Lat], so we flip it here
			let boundsLng2 = boundsArr[2]; // bounds array from openlayer is reversed [Lng,Lat], so we flip it here
			let boundsFinal = [boundsLat1, boundsLng1, boundsLat1, boundsLng2];

			const centerStripStr1:string = "center: ol.proj.fromLonLat(";
			const centerStripStr2:string = "),    zoom:";

			let processCenter1 = htmlStr.substring(htmlStr.indexOf(centerStripStr1), htmlStr.indexOf(centerStripStr2));
			let processCenter2 = processCenter1.split(centerStripStr1).join("");

			let centerArr = JSON.parse(processCenter2);
			let centerLat = centerArr[1]; // bounds array from openlayer is reversed [Lng,Lat], so we flip it here
			let centerLng = centerArr[0]; // bounds array from openlayer is reversed [Lng,Lat], so we flip it here
			let centerFinal = [centerLat, centerLng];


			const zoomStripStr1:string = "zoom:";
			const zoomStripStr2:string = "  })});</script>";

			let processZoom1 = htmlStr.substring(htmlStr.indexOf(zoomStripStr1), htmlStr.indexOf(zoomStripStr2));
			let processZoom2 = processZoom1.split(zoomStripStr1).join("");
			
			let strippedData = {
				bounds: boundsFinal,
				center: centerFinal,
				zoom: parseInt(processZoom2)
			};

			console.log("stripped: ", strippedData);

			this.initLeafletMap(url, strippedData);
			
		});

	}

	initLeafletMap (url:string, data:any) {
		let bounds:LatLngBoundsExpression = [[data.boundsLat1, data.boundsLng1],[data.boundsLat2, data.boundsLng2]];
		let center:LatLng = new LatLng(data.center[0],data.center[1]);

		this.currentCenter = center;
		this.currentBounds = bounds;
		this.currentZoom = data.zoom;

		console.log("init leaflet ==> " + "CENTER: " + this.currentCenter + " ZOOM: " + this.currentZoom + " BOUNDS: " + this.currentBounds);

		setTimeout(() => {
			this.DATA_LOADED = true;
		},2000);

	}

	onDrawCreated (e) {
		console.log("draw type: " + e.layerType);
		console.dir("draw layer: " + e.layer);
	}
}
