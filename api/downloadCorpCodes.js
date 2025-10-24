/**
 * Vercel Serverless Function (Node.js)
 *
 * /api/downloadCorpCodes 엔드포인트
 * DART의 corpCode.xml API를 호출하고,
 * 반환된 Zip 파일을 클라이언트(브라우저)로 직접 스트리밍합니다.
 */
export default async function handler(req, res) {
  
    // 1. Vercel 환경 변수에서 API 키를 안전하게 가져옵니다.
    const apiKey = process.env.DART_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            status: '500', 
            message: 'API 키가 서버에 설정되지 않았습니다. (Vercel 환경 변수 확인)' 
        });
    }

    // 2. 실제 DART API URL (고유번호 목록)
    const dartApiUrl = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${apiKey}`;

    try {
        // 3. 서버에서 DART API로 fetch 요청
        const apiResponse = await fetch(dartApiUrl);

        // 4. DART API 오류 처리 (키 오류 등)
        if (!apiResponse.ok) {
            // DART는 오류 시 XML을 반환합니다.
            const errorText = await apiResponse.text();
            console.error('DART API Error:', errorText);
            const statusMatch = errorText.match(/<status>(\d+)<\/status>/);
            const messageMatch = errorText.match(/<message>(.*?)<\/message>/);
            
            if (statusMatch && messageMatch) {
                return res.status(400).json({ status: statusMatch[1], message: messageMatch[1] });
            }
            return res.status(apiResponse.status).json({ 
                status: apiResponse.status, 
                message: "DART API로부터 ZIP 파일을 가져오는데 실패했습니다." 
            });
        }

        // 5. 응답이 Zip 파일인지 확인 (키가 틀리면 XML이 올 수 있음)
        const contentType = apiResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/zip')) {
             const errorText = await apiResponse.text();
             console.error('DART API did not return zip:', errorText);
             const statusMatch = errorText.match(/<status>(\d+)<\/status>/);
             const messageMatch = errorText.match(/<message>(.*?)<\/message>/);
             
             if (statusMatch && messageMatch) {
                 return res.status(400).json({ status: statusMatch[1], message: messageMatch[1] });
             }
             return res.status(500).json({ status: '500', message: 'API가 Zip 파일을 반환하지 않았습니다. (API 키 오류 가능성)' });
        }

        // 6. 클라이언트에 파일 다운로드 헤더 설정
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="CORPCODE.zip"');
        
        // 7. DART API 응답(웹 스트림)을 Vercel 응답(Node.js 스트림)으로 수동 파이핑
        const reader = apiResponse.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            res.write(value); // 받은 데이터를 즉시 클라이언트로 씀
        }
        res.end(); // 스트림 종료

    } catch (error) {
        console.error('DART API 프록시 오류:', error);
        if (!res.headersSent) {
            return res.status(500).json({ 
                status: '500', 
                message: 'API 요청 중 서버에서 오류가 발생했습니다.' 
            });
        }
    }
}

