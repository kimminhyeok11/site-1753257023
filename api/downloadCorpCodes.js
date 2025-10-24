/**
 * Vercel Serverless Function (Node.js)
 * /api/downloadCorpCodes 엔드포인트
 * * Vercel의 기본 타임아웃(10초)을 60초로 연장합니다.
 * Hobby 플랜에서도 최대 60초까지 가능합니다.
 */
export const maxDuration = 60;

// Node.js의 'stream' 모듈을 가져옵니다.
import { Readable } from 'stream';

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

        // 5. 응답이 Zip 파일인지 확인
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
        
        // 7. [수정됨] Web Stream을 Node.js Stream으로 변환하여 파이핑
        // 이 방식이 Vercel 환경에서 더 안정적입니다.
        if (apiResponse.body) {
            const webStream = apiResponse.body;
            const nodeStream = Readable.fromWeb(webStream);
            await nodeStream.pipe(res);
        } else {
            throw new Error("API 응답에 body가 없습니다.");
        }

    } catch (error) {
        console.error('DART API 프록시 오류:', error);
        if (!res.headersSent) {
            // 헤더가 전송되기 전에 오류가 발생한 경우에만 JSON 오류 응답
            return res.status(500).json({ 
                status: '500', 
                message: 'API 요청 중 서버에서 오류가 발생했습니다.' 
            });
        }
        // 스트리밍이 시작된 후 오류가 발생하면 스트림만 종료
        res.end();
    }
}


