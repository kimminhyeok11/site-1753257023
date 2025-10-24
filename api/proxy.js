/**
 * Vercel Serverless Function (Node.js)
 *
 * 이 파일은 /api/proxy 엔드포인트가 됩니다.
 * 프론트엔드(index.html)로부터 요청을 받아,
 * DART API에 대신 요청을 보낸 후 결과를 다시 프론트엔드로 전달합니다.
 * CORS 문제를 해결하고 API 키를 서버에 안전하게 보관합니다.
 */
export default async function handler(req, res) {
  
    // 1. Vercel 환경 변수에서 API 키를 안전하게 가져옵니다.
    // (Vercel 프로젝트 설정에서 DART_API_KEY 이름으로 키를 등록해야 합니다)
    const apiKey = process.env.DART_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            status: '500', 
            message: 'API 키가 서버에 설정되지 않았습니다. Vercel 환경 변수를 확인하세요.' 
        });
    }

    // 2. 프론트엔드에서 보낸 쿼리 파라미터를 가져옵니다.
    // 예: /api/proxy?corp_code=...&bsns_year=...
    const queryString = req.url.split('?')[1];

    if (!queryString) {
        return res.status(400).json({ 
            status: '400', 
            message: '필수 파라미터가 없습니다.' 
        });
    }

    // 3. 실제 DART API URL을 조립합니다. (쿼리 + 환경 변수의 API 키)
    const dartApiUrl = `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?${queryString}&crtfc_key=${apiKey}`;

    try {
        // 4. 서버(여기)에서 DART API로 fetch 요청 (CORS 문제 없음)
        const apiResponse = await fetch(dartApiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        // 5. DART API로부터 받은 응답을 파싱합니다.
        const data = await apiResponse.json();

        // 6. 결과를 프론트엔드로 다시 전달합니다.
        // Vercel은 자동으로 적절한 CORS 헤더를 설정해줍니다.
        // 캐시 설정 (선택 사항): 1분 동안 캐시하여 반복 요청 속도 향상
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        return res.status(apiResponse.status).json(data);

    } catch (error) {
        console.error('DART API 프록시 오류:', error);
        return res.status(500).json({ 
            status: '500', 
            message: 'API 요청 중 서버에서 오류가 발생했습니다.' 
        });
    }
}

