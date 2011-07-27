/**
 * Pimcore
 *
 * LICENSE
 *
 * This source file is subject to the new BSD license that is bundled
 * with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * http://www.pimcore.org/license
 *
 * @copyright  Copyright (c) 2009-2010 elements.at New Media Solutions GmbH (http://www.elements.at)
 * @license    http://www.pimcore.org/license     New BSD License
 */

pimcore.registerNS("pimcore.object.tags.geopoint");
pimcore.object.tags.geopoint = Class.create(pimcore.object.tags.abstract, {

    type: "geopoint",

    initialize: function (data, fieldConfig) {
        this.data = data;
        this.fieldConfig = fieldConfig;

    },

    getGridColumnConfig: function(field) {
        return {header: ts(field.label), width: 150, sortable: false, dataIndex: field.key, renderer: function (key, value, metaData, record) {
            if(record.data.inheritedFields[key] && record.data.inheritedFields[key].inherited == true) {
                metaData.css += " grid_value_inherited";
            }

            if (value) {
                if (value.latitude && value.longitude) {

                    var width = 140;
                    var mapZoom = 10;

                    var mapUrl;
                    //var mapUrl = "http://dev.openstreetmap.org/~pafciu17/?module=map&center=" + value.longitude + "," + value.latitude + "&zoom=" + mapZoom + "&type=mapnik&width=" + width + "&height=x80&points=" + value.longitude + "," + value.latitude + ",pointImagePattern:red";
                    if (pimcore.settings.google_maps_api_key) {
                        mapUrl = "http://maps.google.com/staticmap?center=" + value.latitude + "," + value.longitude + "&zoom=" + mapZoom + "&size=" + width + "x80&markers=" + value.latitude + "," + value.longitude + ",red&sensor=false&key=" + pimcore.settings.google_maps_api_key;
                    } else {
                        return 'Google Maps API Key not present!';
                    }

                    return '<img src="' + mapUrl + '" />';
                }
            }
        }.bind(this, field.key)};
    },

    getLayoutEdit: function () {


        if (!this.data) {
            this.data = {};
            this.data.longitude = 0;
            this.data.latitude = 0;
        }

        this.mapImageID = uniqid();
        var longitudeConf = {
            value: this.data.longitude,
            decimalPrecision: 15,
            enableKeyEvents: true,
            width: 110
        };
        var latitudeConf = {
            value: this.data.latitude,
            decimalPrecision: 15,
            enableKeyEvents: true,
            width: 110
        };

        this.longitude = new Ext.form.NumberField(longitudeConf);
        this.latitude = new Ext.form.NumberField(latitudeConf);

        // fallback without map
        if (!pimcore.settings.google_maps_api_key) {
            this.component = new Ext.Panel({
                title: this.fieldConfig.title,
                width: 490,
                bodyStyle: "padding: 10px;",
                cls: "object_field",
                html: 'Please set the Google Maps API Key in the System Settings to use this widget.',
                bbar: [t("latitude"), this.latitude, "-", t("longitude"), this.longitude]
            });

            return this.component;
        }




        this.longitude.on("keyup", this.updatePreviewImage.bind(this));
        this.latitude.on("keyup", this.updatePreviewImage.bind(this));

        this.component = new Ext.Panel({
            title: this.fieldConfig.title,
            height: 370,
            width: 490,
            cls: "object_field",
            html: '<div id="google_maps_container_' + this.mapImageID + '" align="center"><img align="center" width="300" height="300" src="' + this.getMapUrl(this.data.latitude, this.data.longitude) + '" /></div>',
            bbar: [t("latitude"), this.latitude, "-", t("longitude"), this.longitude, "-", " ", "-", {
                xtype: "button",
                text: t("open_search_editor"),
                icon: "/pimcore/static/img/icon/magnifier.png",
                handler: this.openPicker.bind(this)
            }]
        });

        this.component.on("afterrender", function () {
            this.updatePreviewImage();
        }.bind(this))

        return this.component;
    },

    getLayoutShow: function () {

        this.component = this.getLayoutEdit();
        this.component.disable();

        return this.component;
    },

    updatePreviewImage: function () {
        var data = this.getValue();
        var width = Ext.get("google_maps_container_" + this.mapImageID).getWidth();

        if (width > 640) {
            width = 640;
        }
        if (width < 10) {
            window.setTimeout(this.updatePreviewImage.bind(this), 1000);
        }

        Ext.get("google_maps_container_" + this.mapImageID).dom.innerHTML = '<img align="center" width="' + width + '" height="300" src="' + this.getMapUrl(data.latitude, data.longitude, width) + '" />';
    },

    getMapUrl: function (latitude, longitude, width) {
        // static maps api image url
        var latitudeMap = 0;
        var longitudeMap = 0;
        var mapZoom = 1;
        if (longitude && latitude) {
            latitudeMap = latitude;
            longitudeMap = longitude;
            mapZoom = 14;
        }

        if (!width) {
            width = 300;
        }

        //var mapUrl = "http://dev.openstreetmap.org/~pafciu17/?module=map&center=" + longitudeMap + "," + latitudeMap + "&zoom=" + mapZoom + "&type=mapnik&width=" + width + "&height=300&points=" + longitudeMap + "," + latitudeMap + ",pointImagePattern:red";
        //if (pimcore.settings.google_maps_api_key) {
        var mapUrl = "http://maps.google.com/staticmap?center=" + latitudeMap + "," + longitudeMap + "&zoom=" + mapZoom + "&size=" + width + "x300&markers=" + latitudeMap + "," + longitudeMap + ",red&sensor=false&key=" + pimcore.settings.google_maps_api_key;
        //}

        return mapUrl;
    },

    openPicker: function () {
        var data = this.getValue();

        this.searchfield = new Ext.form.TextField({
            width: 300,
            name: "mapSearch",
            style: "float: left;",
            fieldLabel: t("search")
        });

        this.mapPanel = new Ext.Panel({
            plain: true
        });

        this.currentLocationTextNode = new Ext.Toolbar.TextItem({
            text: " - "
        });

        this.searchWindow = new Ext.Window({
            modal: true,
            width: 600,
            height: 500,
            resizable: false,
            tbar: [this.currentLocationTextNode],
            bbar: [this.searchfield,{
                xtype: "button",
                text: t("search"),
                icon: "/pimcore/static/img/icon/magnifier.png",
                handler: this.geocode.bind(this)
            },"->",{
                xtype: "button",
                text: t("cancel"),
                icon: "/pimcore/static/img/icon/cancel.png",
                handler: function () {
                    this.searchWindow.close();
                }.bind(this)
            },{
                xtype: "button",
                text: "OK",
                icon: "/pimcore/static/img/icon/tick.png",
                handler: function () {
                    var point = this.marker.getLatLng();
                    this.latitude.setValue(point.lat());
                    this.longitude.setValue(point.lng());
                    this.updatePreviewImage();

                    this.searchWindow.close();
                }.bind(this)
            }],
            plain: true
        });

        this.searchWindow.on("afterrender", function () {
            this.gmap = new GMap2(this.searchWindow.body.dom);
            var customUI = this.gmap.getDefaultUI();
            this.gmap.setUI(customUI);

            var data = this.getValue();
            var latitudeMap = 0;
            var longitudeMap = 0;
            var mapZoom = 1;
            if (data.longitude && data.latitude) {
                latitudeMap = data.latitude;
                longitudeMap = data.longitude;
                mapZoom = 14;
            }

            this.gmap.setCenter(new GLatLng(latitudeMap, longitudeMap), mapZoom);
            this.geocoder = new GClientGeocoder();

            this.marker = new GMarker(new GLatLng(latitudeMap, longitudeMap), {draggable: true});
            this.gmap.addOverlay(this.marker);

            this.reverseGeocodeInterval = window.setInterval(this.reverseGeocode.bind(this), 500)

        }.bind(this))

        this.searchWindow.on("beforeclose", function () {
            clearInterval(this.reverseGeocodeInterval);
        }.bind(this));

        this.searchWindow.show();
    },

    geocode: function () {
        if (this.geocoder) {
            this.geocoder.getLatLng(
                    this.searchfield.getValue(),
                    function(point) {
                        if (point) {
                            this.marker.setLatLng(point);
                            this.gmap.setCenter(point, 16);
                        }
                    }.bind(this)
                    );
        }
    },

    reverseGeocode: function () {

        if (this.marker) {

            var latlng = this.marker.getLatLng();
            if (latlng != this.lastPosition) {
                if (latlng) {
                    this.lastPosition = latlng;
                    this.geocoder.getLocations(latlng, function (response) {
                        try {
                            var place = response.Placemark[0];
                            this.currentLocationTextNode.setText("<b>" + t("current_address") + ": </b>" + place.address);
                        }
                        catch (e) {
                            console.log(e);
                        }
                    }.bind(this));
                }
            }
        }
    },

    getValue: function () {
        return {
            longitude: this.longitude.getValue(),
            latitude: this.latitude.getValue()
        };
    },

    getName: function () {
        return this.fieldConfig.name;
    },

    isInvalidMandatory: function () {

        // no render check is necessary because the input compontent returns the right values even if it is not rendered
        var value = this.getValue();
        if (value.longitude && value.latitude) {
            return false;
        }
        return true;
    },

    isDirty: function() {
        if(!this.isRendered()) {
            return false;
        }
        
        return this.longitude.isDirty() || this.latitude.isDirty();
    }
});