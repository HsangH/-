// 페이지 로드 시 첫 번째 섹션 활성화
window.addEventListener('DOMContentLoaded', () => {
    // 기본적으로 첫 번째 섹션과 네비게이션 링크를 활성화 상태로 설정
    document.querySelector('#busInfo').classList.add('active');
    document.querySelector('nav ul li a[data-target="busInfo"]').classList.add('active');
});

// 탭 클릭 시 활성화
document.querySelectorAll('nav ul li a').forEach(tab => {
    tab.addEventListener('click', function(event) {
        event.preventDefault(); // 기본 링크 동작 막기

        // 모든 섹션과 네비게이션 링크에서 'active' 클래스 제거
        document.querySelectorAll('section').forEach(section => section.classList.remove('active'));
        document.querySelectorAll('nav ul li a').forEach(link => link.classList.remove('active'));

        // 클릭한 링크의 data-target 속성값을 이용해 관련 섹션 활성화
        const targetId = this.getAttribute('data-target');
        const targetSection = document.querySelector(`#${targetId}`);
        targetSection.classList.add('active');
        
        // 클릭한 링크 활성화
        this.classList.add('active');
    });
});

// 버스 번호를 lineid 형식으로 변환하는 함수
function convertToLineId(busNumber) {
    // 하이픈 제거
    let cleanNumber = busNumber.replace(/-/g, '');
    
    // 숫자를 4자리로 변환 (예: 44 -> 0440, 1291 -> 1291)
    if (cleanNumber.length = 2) {
        // 2자리 이하의 숫자는 뒤에 0을 붙임 (44 -> 0440)
        cleanNumber = cleanNumber.padStart(2, '0') + '0'.repeat(2);
    } else {
        // 3자리 이상의 숫자는 그대로 4자리로 만듦 (129-1 -> 1291)
        cleanNumber = cleanNumber.padStart(4, '0');
    }
    
    return `5200${cleanNumber}00`;
}

// 버스 정보 검색 폼 제출 처리
document.querySelector('#busInfo form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const busNumber = document.querySelector('#busNumber').value;
    const busDetails = document.querySelector('#busDetails');
    
    // 버스 번호로 lineid 생성
    const lineid = convertToLineId(busNumber);
    
    try {
        const response = await fetch(`https://apis.data.go.kr/6260000/BusanBIMS/busInfo?serviceKey=LF0MLkh1xXwUe0caiIQLrqFqAKHS9V2pPKJexyR40Zz44LN8DgSNNbY9IKo4gBUBET%2FEfvBBCTDfQeNofaMI4w%3D%3D&lineid=${lineid}&lineno=${busNumber}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const busInfo = data[0];
            busDetails.innerHTML = `
                <h3>${busNumber}번 버스 정보</h3>
                <p>노선 ID: ${lineid}</p>
                <p>버스 유형: ${busInfo.busType || '일반버스'}</p>
                <p>출발지: ${busInfo.startPoint || '-'}</p>
                <p>도착지: ${busInfo.endPoint || '-'}</p>
                <p>첫차 시간: ${busInfo.firstBus || '-'}</p>
                <p>막차 시간: ${busInfo.lastBus || '-'}</p>
            `;
        } else {
            busDetails.innerHTML = '<p>버스 정보를 찾을 수 없습니다.</p>';
        }
    } catch (error) {
        console.error('버스 정보 조회 중 오류 발생:', error);
        busDetails.innerHTML = '<p>버스 정보를 불러오는 중 오류가 발생했습니다.</p>';
    }
});