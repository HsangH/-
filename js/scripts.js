// XML 요소에서 값을 추출하는 헬퍼 함수
function getXmlValue(element, tagName) {
    const node = element.getElementsByTagName(tagName)[0];
    return node ? node.textContent : null;
}

document.addEventListener('DOMContentLoaded', function() {
    // 버스 정보 검색 폼 제출 처리
    const busInfoForm = document.querySelector('#busInfo form');
    if (busInfoForm) {
        busInfoForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const busNumber = document.querySelector('#busNumber').value;
            const busDetails = document.querySelector('#busDetails');
            
            const lineid = convertToLineId(busNumber);
            
            try {
                const response = await fetch(`https://apis.data.go.kr/6260000/BusanBIMS/busInfo?serviceKey=z4L3Oj4dSrn5CPGjrmJA0o02xBNvHWXtNuHNEVcosS%2BQv4T77jp0HlVxdef2NIDoyh3PnRRANxiGNltIVQPNDw%3D%3D&lineid=${lineid}&lineno=${busNumber}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // XML 응답을 텍스트로 받아서 파싱
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                
                // XML에서 필요한 데이터 추출
                const items = xmlDoc.getElementsByTagName('item');
                
                if (items.length > 0) {
                    const busInfo = items[0];
                    busDetails.innerHTML = `
                        <h3>${busNumber}번 버스 정보</h3>
                        <table>
                            <tr><th>노선 ID</th><td>${lineid}</td></tr>
                            <tr><th>버스 유형</th><td>${getXmlValue(busInfo, 'bustype') || '일반버스'}</td></tr>
                            <tr><th>출발지</th><td>${getXmlValue(busInfo, 'startpoint') || '-'}</td></tr>
                            <tr><th>도착지</th><td>${getXmlValue(busInfo, 'endpoint') || '-'}</td></tr>
                            <tr><th>첫차 시간</th><td>${getXmlValue(busInfo, 'firsttime') || '-'}</td></tr>
                            <tr><th>막차 시간</th><td>${getXmlValue(busInfo, 'endtime') || '-'}</td></tr>
                        </table>
                    `;
                } else {
                    busDetails.innerHTML = '<p>버스 정보를 찾을 수 없습니다.</p>';
                }

                await getBusRouteInfo(lineid);
            } catch (error) {
                console.error('버스 정보 조회 중 오류 발생:', error);
                busDetails.innerHTML = '<p>버스 정보를 불러오는 중 오류가 발생했습니다.</p>';
            }
        });
    }

    // 정류소 목록을 가져오는 함수
    async function getBusStopList(bstopnm) {
        try {
            const response = await fetch(`https://apis.data.go.kr/6260000/BusanBIMS/busStopList?serviceKey=z4L3Oj4dSrn5CPGjrmJA0o02xBNvHWXtNuHNEVcosS%2BQv4T77jp0HlVxdef2NIDoyh3PnRRANxiGNltIVQPNDw%3D%3D&pageNo=1&numOfRows=10&bstopnm=${encodeURIComponent(bstopnm)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            
            const items = xmlDoc.getElementsByTagName('item');
            const busStopDetails = document.getElementById('busStopDetails');
            busStopDetails.innerHTML = '';

            const busStops = [];

            if (items.length > 0) {
                const table = document.createElement('table');
                const headerRow = document.createElement('tr');
                headerRow.innerHTML = '<th>정류소명</th><th>정류장 번호</th>';
                table.appendChild(headerRow);

                for (const item of items) {
                    const bstopnm = getXmlValue(item, 'bstopnm');
                    const bstopid = getXmlValue(item, 'bstopid');
                    const arsno = getXmlValue(item, 'arsno') || '마을버스';
                    const gpsX = parseFloat(getXmlValue(item, 'gpsx'));
                    const gpsY = parseFloat(getXmlValue(item, 'gpsy'));

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${bstopnm}</td>
                        <td>${arsno ? arsno : '마을버스'}</td>
                    `;
                    // 행 클릭 이벤트 추가
                    row.style.cursor = 'pointer';
                    row.addEventListener('click', () => getBusArrivalInfo(bstopid, bstopnm, gpsX, gpsY));
                    table.appendChild(row);

                    if (!isNaN(gpsX) && !isNaN(gpsY)) {
                        busStops.push({
                            position: new kakao.maps.LatLng(gpsY, gpsX),
                            name: bstopnm,
                            id: bstopid
                        });
                    }
                }
                busStopDetails.appendChild(table);

                // 지도에 마커 표시
                if (busStops.length > 0) {
                    displayBusStopsOnMap(busStops);
                }
            } else {
                busStopDetails.innerHTML = '<p>정류소 정보를 찾을 수 없습니다.</p>';
            }
        } catch (error) {
            console.error('정류소 목록 조회 중 오류 발생:', error);
        }
    }

    // 정류소 검색 폼 제출 처리
    const busStopSearchForm = document.querySelector('#busStopSearchForm');
    if (busStopSearchForm) {
        busStopSearchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const busStopName = document.querySelector('#busStopName').value;
            getBusStopList(busStopName);
        });
    }

    // 네비게이션 링크 클릭 처리
    document.querySelectorAll('nav ul li a').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('data-target');
            
            // 모든 섹션 비활성화
            document.querySelectorAll('section').forEach(section => {
                section.classList.remove('active');
            });
            
            // 선택한 섹션 활성화
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // 검색 입력창과 결과 초기화
            const busStopInput = document.getElementById('busStopName');
            const busStopDetails = document.getElementById('busStopDetails');
            if (busStopInput) busStopInput.value = '';
            if (busStopDetails) busStopDetails.innerHTML = '';
            
            // 네비게이션 링크 활성화 상태 업데이트
            document.querySelectorAll('nav ul li a').forEach(navLink => {
                navLink.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // 버스 도착 정보를 가져오는 함수
    async function getBusArrivalInfo(bstopid, bstopnm, gpsX, gpsY) {
        try {
            const response = await fetch(`https://apis.data.go.kr/6260000/BusanBIMS/stopArrByBstopid?serviceKey=z4L3Oj4dSrn5CPGjrmJA0o02xBNvHWXtNuHNEVcosS%2BQv4T77jp0HlVxdef2NIDoyh3PnRRANxiGNltIVQPNDw%3D%3D&bstopid=${bstopid}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            
            const items = xmlDoc.getElementsByTagName('item');
            
            // busStopDetails의 내용을 모두 지우고 새로운 정보 추가
            const busStopDetails = document.getElementById('busStopDetails');
            busStopDetails.innerHTML = '';
            
            // 도착 정보를 표시할 div 생성
            const arrivalInfoDiv = document.createElement('div');
            arrivalInfoDiv.className = 'arrival-info';
            arrivalInfoDiv.innerHTML = `<h3>${bstopnm} 버스 도착 정보</h3>`;

            if (items.length > 0) {
                const table = document.createElement('table');
                const headerRow = document.createElement('tr');
                headerRow.innerHTML = '<th>버스번호</th><th>도착 예정 시간</th><th>남은 정류장</th>';
                table.appendChild(headerRow);

                for (const item of items) {
                    const lineno = getXmlValue(item, 'lineno');
                    const min1 = getXmlValue(item, 'min1');
                    const station1 = getXmlValue(item, 'station1');

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${lineno || '대기중'}</td>
                        <td>${min1 ? min1 + '분' : '대기중'}</td>
                        <td>${station1 ? station1 + '정류장' : '대기중'}</td>
                    `;
                    table.appendChild(row);
                }
                arrivalInfoDiv.appendChild(table);
            } else {
                arrivalInfoDiv.innerHTML += '<p>도착 예정인 버스가 없습니다.</p>';
            }

            busStopDetails.appendChild(arrivalInfoDiv);

            // 선택된 정류소의 마커만 표시
            const selectedBusStop = [{
                position: new kakao.maps.LatLng(gpsY, gpsX),
                name: bstopnm
            }];
            displayBusStopsOnMap(selectedBusStop);

        } catch (error) {
            console.error('버스 도착 정보 조회 중 오류 발생:', error);
        }
    }
});

// 버스 번호를 lineid 형식으로 변환하는 함수
function convertToLineId(busNumber) {
    // 하이픈이 있는지 확인
    const hasHyphen = busNumber.includes('-');
    // 하이픈 제거
    let cleanNumber = busNumber.replace(/-/g, '');
    
    // 숫자를 4자리로 변환 (예: 44 -> 0440, 1291 -> 1291)
    if (cleanNumber.length <= 2) {
        // 2자리 이하의 숫자는 뒤에 0을 붙임 (44 -> 0440)
        cleanNumber = cleanNumber.padStart(2, '0') + '0'.repeat(1);
        return `52000${cleanNumber}00`;
    } 
    else if (cleanNumber.length === 3) {
        cleanNumber = cleanNumber.padStart(3, '0');
        return `5200${cleanNumber}000`;
    }   
    else if (hasHyphen) {
        // 3자리 이상의 숫자는 그대로 4자리로 만듦 (129-1 -> 1291)
        cleanNumber = cleanNumber.padStart(4, '0');
        return `5200${cleanNumber}00`;
    }
    else {
        // 4자리 숫자인 경우 노선번호 변환 (예: 1001 -> 5201001000)
        cleanNumber = cleanNumber.padStart(4, '0');
        return `520${cleanNumber}000`;  
    }
    
    
}

// 정류소 정보를 지도에 표시하는 함수
function displayBusStopsOnMap(busStops) {
    console.log('지도 표시 시작', busStops); // 디버깅용 로그

    const container = document.getElementById('busStopMap');
    if (!container) {
        console.error('지도 컨테이너를 찾을 수 없습니다.');
        return;
    }

    // 지도 옵션 설정
    const options = {
        center: busStops[0].position, // 첫 번째 정류장을 중심으로
        level: 3
    };

    // 지도 생성
    const map = new kakao.maps.Map(container, options);

    // 마커 생성 및 표시
    busStops.forEach(stop => {
        console.log('마커 생성:', stop.position.toString()); // 마커 위치 로그

        const marker = new kakao.maps.Marker({
            map: map,
            position: stop.position
        });

        // 인포윈도우 생성
        const infowindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:5px;font-size:12px;">${stop.name}</div>`
        });

        // 마커 클릭시 인포윈도우 표시
        kakao.maps.event.addListener(marker, 'click', function() {
            infowindow.open(map, marker);
        });
    });

    // 노든 마커가 보이도록 지도 범위 재설정
    const bounds = new kakao.maps.LatLngBounds();
    busStops.forEach(stop => bounds.extend(stop.position));
    map.setBounds(bounds);
}

// 버스 노선도 정보를 가져오는 함수
async function getBusRouteInfo(lineid) {
    try {
        const response = await fetch(`https://apis.data.go.kr/6260000/BusanBIMS/busInfoByRouteId?serviceKey=z4L3Oj4dSrn5CPGjrmJA0o02xBNvHWXtNuHNEVcosS%2BQv4T77jp0HlVxdef2NIDoyh3PnRRANxiGNltIVQPNDw%3D%3D&lineid=${lineid}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const items = xmlDoc.getElementsByTagName('item');
        const busStops = [];

        for (const item of items) {
            const gpsY = parseFloat(getXmlValue(item, 'gpsY')); // 위도
            const gpsX = parseFloat(getXmlValue(item, 'gpsX')); // 경도
            const bstopnm = getXmlValue(item, 'bstopnm');
            const bstopid = getXmlValue(item, 'bstopid');

            console.log(`정류장 정보: ${bstopnm}, 위도: ${gpsY}, 경도: ${gpsX}`); // 좌표 확인

            if (gpsY && gpsX && !isNaN(gpsY) && !isNaN(gpsX)) {
                busStops.push({
                    position: new kakao.maps.LatLng(gpsY, gpsX),
                    name: bstopnm,
                    id: bstopid
                });
            }
        }

        if (busStops.length > 0) {
            console.log(`${busStops.length}개의 정류장을 찾았습니다.`);
            displayBusStopsOnMap(busStops);
        } else {
            console.error('표시할 정류장이 없습니다.');
        }
    } catch (error) {
        console.error('노선 정보 조회 중 오류 발생:', error);
    }
}

// 지도에 노선 정보를 표시하는 함수
function displayRouteOnMap(routePoints) {
    if (routePoints.length === 0) {
        console.error('노선 정보가 없습니다.');
        return;
    }

    const mapContainer = document.getElementById('busRouteMap');
    const mapOption = {
        center: routePoints[0].position, // 첫 번째 정류장을 중심으로
        level: 5
    };

    const map = new kakao.maps.Map(mapContainer, mapOption);

    // 정류장 마커 생성
    routePoints.forEach(point => {
        const marker = new kakao.maps.Marker({
            position: point.position,
            map: map
        });

        // 정류장 이름 인포윈도우 생성
        const infowindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:5px;">${point.name}</div>`
        });

        // 마커 클릭시 인포윈도우 표시
        kakao.maps.event.addListener(marker, 'click', function() {
            infowindow.open(map, marker);
        });
    });

    // 노선 라인 그리기
    const linePath = routePoints.map(point => point.position);
    const busLine = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 3,
        strokeColor: '#FF0000',
        strokeOpacity: 0.7
    });

    busLine.setMap(map);
}

