export const mapService = {
    initMap,
    getUserPosition,
    setMarker,
    panTo,
    lookupAddressGeo,
    addClickListener,
    gMap: null
}

const API_KEY = 'AIzaSyAFUswrot09IpiaHmKfjwtqyWvaDxWSTV0'

var gMap
var gMarker

function initMap(lat = 32.0749831, lng = 34.9120554) {
    return _connectGoogleApi()
        .then(() => {
            gMap = new google.maps.Map(
                document.querySelector('.map'), {
                center: { lat, lng },
                zoom: 15,
                mapTypeId: google.maps.MapTypeId.SATELLITE
            })

            mapService.gMap = gMap
        })
}

function panTo({ lat, lng, zoom = 19 }) {
    const laLatLng = new google.maps.LatLng(lat, lng)
    gMap.panTo(laLatLng)
    gMap.setZoom(zoom)
}

/* <yahav> editing function */
function lookupAddressGeo(geoOrAddress) {
    var url = `https://maps.googleapis.com/maps/api/geocode/json?key=${API_KEY}&`
    url += (geoOrAddress.lat) ? `latlng=${geoOrAddress.lat},${geoOrAddress.lng}` :
        `address=${geoOrAddress}`
    return fetch(url)
        .then(res => res.json())
        .then(res => {
            if (!res.results.length) return new Error('Found nothing')
            res = res.results[0]
            const { formatted_address, geometry } = res

            const geo = {
                address: formatted_address.substring(formatted_address.indexOf(' ')).trim(),
                lat: geometry.location.lat,
                lng: geometry.location.lng,
                zoom: gMap.getZoom()
            }
            return geo
        })

}

function addClickListener(cb) {
    gMap.addListener('click', (mapsMouseEvent) => {
        const geo = { lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng() }
        lookupAddressGeo(geo).then(cb)
    })
}

/* <yahav> editing function to accept also geo */
function setMarker(locOrGeo, name = 'Searched location') {
    if (gMarker) gMarker.setMap(null)
    if (!locOrGeo) return

    const geo = locOrGeo.geo || locOrGeo

    gMarker = new google.maps.Marker({
        position: { lat: +geo.lat, lng: +geo.lng },
        map: gMap,
        title: locOrGeo.name || name
    })
}

// This function provides a Promise API to the callback-based-api of getCurrentPosition
function getUserPosition() {
    return new Promise((resolve) => {
        function onSuccess(res) {
            const lat = res.coords.latitude
            const lng = res.coords.longitude
            resolve({ lat, lng })
        }

        function onError() {
            resolve({ lat: 31.88282, lng: 34.85832 })
        }

        navigator.geolocation.getCurrentPosition(onSuccess, onError)
    })
}


function _connectGoogleApi() {
    if (window.google) return Promise.resolve()

    const elGoogleApi = document.createElement('script')
    elGoogleApi.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`
    elGoogleApi.async = true
    document.body.append(elGoogleApi)

    return new Promise((resolve, reject) => {
        elGoogleApi.onload = resolve
        elGoogleApi.onerror = () => reject('GoogleMaps script failed to load')
    })
}

