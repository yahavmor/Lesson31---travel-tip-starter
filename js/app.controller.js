
import { utilService } from './services/util.service.js'
import { locService } from './services/loc.service.js'
import { mapService } from './services/map.service.js'

window.onload = onInit

// To make things easier in this project structure 
// functions that are called from DOM are defined on a global app object
window.app = {
    onRemoveLoc,
    onUpdateLoc,
    onSelectLoc,
    onPanToUserPos,
    onSearchAddress,
    onCopyLoc,
    onShareLoc,
    onSetSortBy,
    onSetFilterBy,
    onCloseLocationModal, // Guy Add this function
    onToggleTheme, // Guy Add this function
    onCloseWindow, // Guy Add this function
    onClickEarth, // Guy Add this function
}

function onClickEarth() {
    const welcomeMsg = document.querySelector('.welcome-message')
    welcomeMsg.classList.add('hidden')

    const elVideo = document.querySelector('.globe video')
    const elGlobe = document.querySelector('.globe')

    elVideo.classList.add('zoom-in')

    setTimeout(() => {
        elGlobe.classList.add('hidden')

        const elMap = document.querySelector('.map')
        elMap.classList.remove('hidden')

        const elSideBar = document.querySelector('.side-bar')
        elSideBar.classList.remove('hidden')

        const elSearchForm = document.querySelector('.form-search')
        elSearchForm.classList.remove('hidden')


        setTimeout(() => {
            if (window.google && window.google.maps) {

                mapService.initMap()
                    .then(() => {

                        startMapZoomAnimation()
                        mapService.addClickListener(onAddLoc)
                        loadAndRenderLocs()
                    })
            }
        }, 200)

    }, 1500)
}

// <Guy> Add this function
function startMapZoomAnimation() {
    if (!mapService.gMap) return

    mapService.getUserPosition()
        .then(userPos => {
            locService.gUserPos = userPos

            mapService.gMap.setMapTypeId(google.maps.MapTypeId.SATELLITE)
            mapService.gMap.setCenter({ lat: userPos.lat, lng: userPos.lng })

            let currentZoom = 2
            const targetZoom = 15
            const zoomStep = 0.2
            const delay = 100

            mapService.gMap.setZoom(currentZoom)

            const zoomInterval = setInterval(() => {
                currentZoom += zoomStep

                if (currentZoom >= targetZoom) {
                    mapService.gMap.setZoom(targetZoom)
                    clearInterval(zoomInterval)

                    setTimeout(() => {
                        mapService.gMap.setMapTypeId(google.maps.MapTypeId.ROADMAP)
                        flashMsg(`You are at Latitude: ${userPos.lat} Longitude: ${userPos.lng}`)
                        loadAndRenderLocs()
                    }, 300)

                } else {
                    mapService.gMap.setZoom(currentZoom)
                }
            }, delay)
        })
        .catch(err => {
            console.error('Cannot get user position:', err)
            mapService.gMap.setCenter({ lat: 32.0749831, lng: 34.9120554 })
            flashMsg('Cannot get your position, showing default location')
        })
}

function onInit() {
    getFilterByFromQueryParams()
    loadAndRenderLocs()
    mapService.initMap()
        .then(() => {
            // onPanToTokyo()
            mapService.addClickListener(onAddLoc)
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot init map')
        })
}

function renderLocs(locs) {
    const selectedLocId = getLocIdFromQueryParams()

    var strHTML = locs.map(loc => {
        const className = (loc.id === selectedLocId) ? 'active' : ''
        return `
        <li class="loc ${className}" data-id="${loc.id}">
            <h4>  
                <span>${loc.name}</span>
                <span>distance from you:  ${loc.dis} Km</span>
                <span title="${loc.rate} stars">${'★'.repeat(loc.rate)}</span>
            </h4>
            <p class="muted">
                Created: ${utilService.elapsedTime(loc.createdAt)}
                ${(loc.createdAt !== loc.updatedAt) ?
                ` | Updated: ${utilService.elapsedTime(loc.updatedAt)}`
                : ''}
            </p>
            <div class="loc-btns">     
               <button title="Delete" onclick="app.onRemoveLoc('${loc.id}')">🗑️</button>
               <button title="Edit" onclick="app.onUpdateLoc('${loc.id}')">✏️</button>
               <button title="Select" onclick="app.onSelectLoc('${loc.id}')">🗺️</button>
            </div>     
        </li>`}).join('')

    const elLocList = document.querySelector('.loc-list')
    elLocList.innerHTML = strHTML || 'No locs to show'

    renderLocStats()

    if (selectedLocId) {
        const selectedLoc = locs.find(loc => loc.id === selectedLocId)
        displayLoc(selectedLoc)
    }
    document.querySelector('.debug').innerText = JSON.stringify(locs, null, 2)
}

/* <yahav> editing function to set marker */
function onSearchAddress(ev) {
    ev.preventDefault()
    const el = document.querySelector('[name=address]')
    mapService.lookupAddressGeo(el.value)
        .then(geo => {
            mapService.panTo(geo)
            mapService.setMarker(geo)
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot lookup address')
        })
}

// <Guy> Add this function
function onCloseWindow() {
    const dialog = document.querySelector('.selected-loc')
    // console.log('dialog:', dialog)
    dialog.classList.remove('show')

    const location = document.querySelector('.rate-modal')
    console.log('location:', location)
    location.close()

}

// <Guy > edit this function to create initial locs
function onAddLoc(geo) {
    const dialog = document.querySelector('.location-modal')
    dialog.showModal()

    const nameInput = document.querySelector('[name=loc-name]')
    nameInput.value = geo.address || 'Just a place'

    const saveBtn = dialog.querySelector('.btn-save')
    const handleSave = (ev) => {
        ev.preventDefault()
        const locName = document.querySelector('[name=loc-name]').value
        const locRate = document.querySelector('[name=loc-rate]').value

        if (!locName.trim()) {
            flashMsg('Please enter a location name')
            return
        }

        dialog.close()

        const clickPos = { lat: geo.lat, lng: geo.lng }
        const dis = utilService.getDistance(locService.gUserPos, clickPos)
        const loc = {
            name: locName,
            rate: +locRate,
            geo,
            dis: dis
        }

        locService.save(loc)
            .then((savedLoc) => {
                flashMsg(`Added Location (id: ${savedLoc.id})`)
                utilService.updateQueryParams({ locId: savedLoc.id })
                loadAndRenderLocs()
                locService.showDistance(loc)
            })
            .catch(err => {
                console.error('OOPs:', err)
                flashMsg('Cannot add location')
            })

        saveBtn.removeEventListener('click', handleSave)
    }

    saveBtn.addEventListener('click', handleSave)
}

// Guy Add this function
function onCloseLocationModal() {
    const dialog = document.querySelector('.location-modal')
    dialog.close()
}

function loadAndRenderLocs() {
    locService.query()
        .then(renderLocs)
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot load locations')
        })
}

function onPanToUserPos() {
    mapService.getUserPosition()
        .then(latLng => {
            locService.gUserPos = latLng
            mapService.panTo({ ...locService.gUserPos, zoom: 15 })
            unDisplayLoc()
            loadAndRenderLocs()
            flashMsg(`You are at Latitude: ${locService.gUserPos.lat} Longitude: ${locService.gUserPos.lng}`)
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot get your position')
        })
}

// <Guy > edite this function to create initial locs 
function onUpdateLoc(locId) {
    locService.getById(locId)
        .then(loc => {
            // open modal
            const dialog = document.querySelector('.rate-modal')
            dialog.showModal()


            dialog.querySelector('.loc-name').innerText = loc.name
            const rateInput = dialog.querySelector('[name=loc-rate]')
            rateInput.value = loc.rate


            const saveBtn = dialog.querySelector('.btn-save')
            const handleSave = () => {
                const newRate = +rateInput.value

                if (newRate && newRate !== loc.rate) {
                    loc.rate = newRate
                    locService.save(loc)
                        .then(savedLoc => {
                            flashMsg(`Rate was set to: ${savedLoc.rate}`)
                            loadAndRenderLocs()
                            dialog.close()
                        })
                        .catch(err => {
                            console.error('OOPs:', err)
                            flashMsg('Cannot update location')
                        })
                } else {
                    dialog.close()
                }


                saveBtn.removeEventListener('click', handleSave)
            }

            saveBtn.addEventListener('click', handleSave)
        })
}

function onSelectLoc(locId) {
    return locService.getById(locId)
        .then(displayLoc)
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot display this location')
        })
}

function displayLoc(loc) {
    document.querySelector('.theme-toggle-container').style.border = 'none' //yahav 12/09/25 09:43 
    document.querySelector('.loc.active')?.classList?.remove('active')
    document.querySelector(`.loc[data-id="${loc.id}"]`).classList.add('active')

    mapService.panTo(loc.geo)
    mapService.setMarker(loc)

    const el = document.querySelector('.selected-loc')
    el.querySelector('.loc-name').innerText = loc.name
    el.querySelector('.loc-address').innerText = loc.geo.address
    el.querySelector('.loc-distance').innerText = `${loc.dis} Km from you`
    // <!-- yahav 10/09 19:15 adding loc distance display -->
    el.querySelector('.loc-rate').innerHTML = '★'.repeat(loc.rate)
    el.querySelector('[name=loc-copier]').value = window.location
    el.classList.add('show')

    utilService.updateQueryParams({ locId: loc.id })
}

function unDisplayLoc() {
    utilService.updateQueryParams({ locId: '' })
    document.querySelector('.selected-loc').classList.remove('show')
    mapService.setMarker(null)
}

function onCopyLoc() {
    const elCopy = document.querySelector('[name=loc-copier]')
    elCopy.select()
    elCopy.setSelectionRange(0, 99999) // For mobile devices
    navigator.clipboard.writeText(elCopy.value)
    flashMsg('Link copied, ready to paste')
}

function onShareLoc() {
    const url = document.querySelector('[name=loc-copier]').value

    // title and text not respected by any app (e.g. whatsapp)
    const data = {
        title: 'Cool location',
        text: 'Check out this location',
        url
    }
    navigator.share(data)
}

function flashMsg(msg) {
    const el = document.querySelector('.user-msg')
    el.innerText = msg
    el.classList.add('open')
    setTimeout(() => {
        el.classList.remove('open')
    }, 3000)
}

function getFilterByFromQueryParams() {
    const queryParams = new URLSearchParams(window.location.search)
    const txt = queryParams.get('txt') || ''
    const minRate = queryParams.get('minRate') || 0
    locService.setFilterBy({ txt, minRate })

    document.querySelector('input[name="filter-by-txt"]').value = txt
    document.querySelector('input[name="filter-by-rate"]').value = minRate
}

function getLocIdFromQueryParams() {
    const queryParams = new URLSearchParams(window.location.search)
    const locId = queryParams.get('locId')
    return locId
}

function onSetSortBy() {
    const prop = document.querySelector('.sort-by').value
    const isDesc = document.querySelector('.sort-desc').checked


    if (!prop) return

    const sortBy = {}
    sortBy[prop] = (isDesc) ? -1 : 1

    // Shorter Syntax:
    // const sortBy = {
    //     [prop] : (isDesc)? -1 : 1
    // }

    locService.setSortBy(sortBy)
    loadAndRenderLocs()
}

function onSetFilterBy({ txt, minRate }) {
    const filterBy = locService.setFilterBy({ txt, minRate: +minRate })
    utilService.updateQueryParams(filterBy)
    loadAndRenderLocs()
}

function renderLocStats() {
    locService.getLocCountByRateMap().then(stats => {
        handleStats(stats, 'loc-stats-rate')
    })
}

function handleStats(stats, selector) {
    // stats = { low: 37, medium: 11, high: 100, total: 148 }
    // stats = { low: 5, medium: 5, high: 5, baba: 55, mama: 30, total: 100 }
    const labels = cleanStats(stats)
    const colors = utilService.getColors()

    var sumPercent = 0
    var colorsStr = `${colors[0]} ${0}%, `
    labels.forEach((label, idx) => {
        if (idx === labels.length - 1) return
        const count = stats[label]
        const percent = Math.round((count / stats.total) * 100, 2)
        sumPercent += percent
        colorsStr += `${colors[idx]} ${sumPercent}%, `
        if (idx < labels.length - 1) {
            colorsStr += `${colors[idx + 1]} ${sumPercent}%, `
        }
    })

    colorsStr += `${colors[labels.length - 1]} ${100}%`
    // Example:
    // colorsStr = `purple 0%, purple 33%, blue 33%, blue 67%, red 67%, red 100%`

    const elPie = document.querySelector(`.${selector} .pie`)
    const style = `background-image: conic-gradient(${colorsStr})`
    elPie.style = style

    const ledendHTML = labels.map((label, idx) => {
        return `
                <li>
                    <span class="pie-label" style="background-color:${colors[idx]}"></span>
                    ${label} (${stats[label]})
                </li>
            `
    }).join('')

    const elLegend = document.querySelector(`.${selector} .legend`)
    elLegend.innerHTML = ledendHTML
}

function cleanStats(stats) {
    const cleanedStats = Object.keys(stats).reduce((acc, label) => {
        if (label !== 'total' && stats[label]) {
            acc.push(label)
        }
        return acc
    }, [])
    return cleanedStats
}

function onCancel() {
    return new Promise((resolve) => {
        resolve("Canceled");
    });
}

function onConfirm(locId) {
    return locService.remove(locId)
        .then(() => {
            flashMsg('Location removed');
            unDisplayLoc();
            loadAndRenderLocs();
            return "Deleted";
        })
        .catch(err => {
            console.error('Oops:', err);
            flashMsg('Cannot remove location');
            throw err;
        })
}

function onRemoveLoc(locId) {
    document.querySelector('.removal-modal').showModal();

    document.querySelector('.btn-cancel').addEventListener('click', () => {
        onCancel().then(result => {
            console.log("Result:", result);
            document.querySelector('.removal-modal').close();
        });
    });

    document.querySelector('.btn-confirm').addEventListener('click', () => {
        onConfirm(locId)
            .then(result => {
                console.log("Result:", result);
                document.querySelector('.removal-modal').close();
            })
            .catch(err => {
                console.error("Error during deletion:", err);
            });
    });
}

function onToggleTheme(isDarkTheme) {
    const root = document.documentElement

    if (isDarkTheme) {

        root.style.setProperty('--bg1', 'rgb(37, 13, 195)')
        root.style.setProperty('--bg2', 'rgb(26, 110, 146)')
        root.style.setProperty('--bg3', 'rgb(9, 49, 226)')
        root.style.setProperty('--color2', 'rgb(94, 169, 240)')
        root.style.setProperty('--color3', 'rgb(211, 187, 48)')
        root.style.setProperty('--color4', 'rgb(90, 66, 6)')
    } else {

        root.style.setProperty('--bg1', 'darkslateblue')
        root.style.setProperty('--bg2', 'darkorchid')
        root.style.setProperty('--bg3', 'darkmagenta')
        root.style.setProperty('--color2', 'deeppink')
        root.style.setProperty('--color3', 'gold')
        root.style.setProperty('--color4', 'goldenrod')
    }
}