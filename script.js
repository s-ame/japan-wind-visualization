// 風データ生成に関するコンスタント
const JAPAN_REGIONS = [
    // 北海道・東北
    {city: "Sapporo", lat: 43.06, lon: 141.35},     // 北海道
    {city: "Aomori", lat: 40.82, lon: 140.74},      // 青森
    {city: "Sendai", lat: 38.27, lon: 140.87},      // 宮城
    // 関東
    {city: "Tokyo", lat: 35.69, lon: 139.69},       // 東京
    {city: "Yokohama", lat: 35.44, lon: 139.64},    // 神奈川
    {city: "Chiba", lat: 35.61, lon: 140.12},       // 千葉
    // 中部
    {city: "Niigata", lat: 37.90, lon: 139.02},     // 新潟
    {city: "Nagoya", lat: 35.18, lon: 136.91},      // 愛知
    {city: "Kanazawa", lat: 36.59, lon: 136.63},    // 石川
    // 関西
    {city: "Osaka", lat: 34.69, lon: 135.50},       // 大阪
    {city: "Kyoto", lat: 35.02, lon: 135.76},       // 京都
    {city: "Kobe", lat: 34.69, lon: 135.20},        // 兵庫
    // 中国・四国
    {city: "Hiroshima", lat: 34.40, lon: 132.46},   // 広島
    {city: "Matsuyama", lat: 33.84, lon: 132.77},   // 愛媛
    {city: "Kochi", lat: 33.56, lon: 133.53},       // 高知
    // 九州・沖縄
    {city: "Fukuoka", lat: 33.61, lon: 130.42},     // 福岡
    {city: "Kagoshima", lat: 31.59, lon: 130.56},   // 鹿児島
    {city: "Naha", lat: 26.21, lon: 127.68}         // 沖縄
];

// 日本の地理的範囲
const LON_MIN = 127.0;  // 最西端（沖縄）
const LON_MAX = 146.0;  // 最東端（北海道）
const LAT_MIN = 24.0;   // 最南端（沖縄）
const LAT_MAX = 46.0;   // 最北端（北海道）

// プロキシサーバーのURL（実際のNetlifyのURLに置き換えてください）
const PROXY_API_URL = "https://japan-wind-proxy.netlify.app/api/wind-data";

// 風のデータに関する色の定義
const WIND_COLORS = {
    low: "#E1F5E1",     // 弱風（薄い緑）
    medium: "#009E4F",  // 中風（標準の緑）
    high: "#00773C"     // 強風（濃い緑）
};

// モックデータを生成する関数（APIが利用できない場合のテスト用）
function generateMockWindData() {
    return JAPAN_REGIONS.map(region => ({
        city: region.city,
        lon: region.lon,
        lat: region.lat,
        wind_speed: Math.random() * 10 + 1, // 1~11 m/s
        wind_deg: Math.floor(Math.random() * 360) // 0~359度
    }));
}

// 風速から色を取得する関数
function getWindColor(windSpeed, maxSpeed, minSpeed) {
    // 風速を0〜1の範囲に正規化
    const normalizedSpeed = maxSpeed === minSpeed ? 
        0.5 : (windSpeed - minSpeed) / (maxSpeed - minSpeed);
    
    // 色の範囲を定義
    const r1 = parseInt(WIND_COLORS.low.substr(1, 2), 16);
    const g1 = parseInt(WIND_COLORS.low.substr(3, 2), 16);
    const b1 = parseInt(WIND_COLORS.low.substr(5, 2), 16);
    
    const r2 = parseInt(WIND_COLORS.medium.substr(1, 2), 16);
    const g2 = parseInt(WIND_COLORS.medium.substr(3, 2), 16);
    const b2 = parseInt(WIND_COLORS.medium.substr(5, 2), 16);
    
    const r3 = parseInt(WIND_COLORS.high.substr(1, 2), 16);
    const g3 = parseInt(WIND_COLORS.high.substr(3, 2), 16);
    const b3 = parseInt(WIND_COLORS.high.substr(5, 2), 16);
    
    let r, g, b;
    
    if (normalizedSpeed < 0.5) {
        // 薄緑から標準緑へのグラデーション
        const t = normalizedSpeed * 2; // 0~0.5を0~1にスケール
        r = Math.round(r1 + (r2 - r1) * t);
        g = Math.round(g1 + (g2 - g1) * t);
        b = Math.round(b1 + (b2 - b1) * t);
    } else {
        // 標準緑から濃緑へのグラデーション
        const t = (normalizedSpeed - 0.5) * 2; // 0.5~1を0~1にスケール
        r = Math.round(r2 + (r3 - r2) * t);
        g = Math.round(g2 + (g3 - g2) * t);
        b = Math.round(b2 + (b3 - b2) * t);
    }
    
    // RGB値を16進数形式に変換
    return `rgb(${r},${g},${b})`;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // 要素の取得
    const contrastInput = document.getElementById('contrastInput');
    const contrastValue = document.getElementById('contrastValue');
    const showArrowsCheckbox = document.getElementById('showArrows');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const windCanvas = document.getElementById('windCanvas');
    const logoImage = document.getElementById('logoImage');
    
    // すべての要素が取得できているか確認
    if (!windCanvas || !logoImage) {
        console.error('必要な要素が見つかりません。HTML内のID名を確認してください。');
        return;
    }
    
    // キャンバスのコンテキストを取得
    const windCtx = windCanvas.getContext('2d');
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    const dataContainer = document.getElementById('dataContainer');
    const windDataTable = document.getElementById('windDataTable');
    const errorMessage = document.getElementById('errorMessage');
    
    // コントラスト値の表示を更新
    contrastInput.addEventListener('input', function() {
        contrastValue.textContent = this.value;
    });
    
    // 初期テキストの表示
    function initializeWindCanvas() {
        console.log('風データキャンバスの初期化');
        windCtx.clearRect(0, 0, windCanvas.width, windCanvas.height);
        windCtx.font = '16px Arial';
        windCtx.fillStyle = '#666';
        windCtx.textAlign = 'center';
        windCtx.fillText('「風データを取得して視覚化」ボタンをクリックしてください', windCanvas.width/2, windCanvas.height/2);
    }
    
    // 画像生成ボタンの処理
    generateBtn.addEventListener('click', async function() {
        console.log('風データ生成開始');
        try {
            // 入力値の取得
            const contrast = parseFloat(contrastInput.value);
            const showArrows = showArrowsCheckbox.checked;
            
            // ローディング表示
            loadingIndicator.style.display = 'block';
            dataContainer.style.display = 'none';
            errorMessage.style.display = 'none';
            downloadBtn.disabled = true;
            
            // プロキシサーバーから風データを取得（または失敗した場合はモックデータを使用）
            console.log('風データ取得中...');
            let windData;
            try {
                windData = await fetchWindData();
                console.log('API風データ取得成功', windData);
            } catch (error) {
                console.warn('API取得エラー、モックデータを使用します:', error);
                windData = generateMockWindData();
                console.log('モックデータ生成完了', windData);
            }
            
            // データをテーブルに表示
            displayWindData(windData);
            
            // 風データグラフィックを生成
            console.log('風データグラフィック生成中...');
            drawWindDataGraphic(windCanvas, windData, contrast, showArrows);
            
            // ローディングを非表示
            loadingIndicator.style.display = 'none';
            dataContainer.style.display = 'block';
            downloadBtn.disabled = false;
            
            console.log('風データ生成完了');
        } catch (error) {
            console.error('エラー発生:', error);
            loadingIndicator.style.display = 'none';
            errorMessage.textContent = error.message || 'エラーが発生しました。';
            errorMessage.style.display = 'block';
        }
    });
    
    // プロキシサーバーから風データを取得する関数
    async function fetchWindData() {
        // プロキシAPIが利用できない場合、ダミーデータを返す
        try {
            const response = await fetch(PROXY_API_URL);
            if (!response.ok) {
                throw new Error(`データの取得に失敗しました（ステータス: ${response.status}）`);
            }
            return await response.json();
        } catch (error) {
            console.warn('APIからのデータ取得に失敗しました:', error);
            return generateMockWindData();
        }
    }
    
    // 風データをテーブルに表示
    function displayWindData(windData) {
        // テーブルの内容をクリア
        windDataTable.innerHTML = '';
        
        // 風データをテーブルに追加（風速の降順でソート）
        windData.sort((a, b) => b.wind_speed - a.wind_speed);
        
        windData.forEach(city => {
            const row = document.createElement('tr');
            
            // 方角の計算
            const direction = getWindDirection(city.wind_deg);
            
            row.innerHTML = `
                <td>${city.city}</td>
                <td>${city.wind_speed.toFixed(1)}</td>
                <td>${city.wind_deg}</td>
                <td>${direction}</td>
            `;
            windDataTable.appendChild(row);
        });
    }
    
    // 風向きから方角を取得する関数
    function getWindDirection(degrees) {
        const directions = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', 
                             '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }
    
    // 風データグラフィックの描画
    function drawWindDataGraphic(canvas, windData, contrastFactor, showArrows) {
        console.log('風データグラフィック描画開始', {windData, contrastFactor, showArrows});
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, width, height);
        
        // 背景を設定（グラデーション）
        const bgGradient = ctx.createLinearGradient(0, 0, width, 0);
        bgGradient.addColorStop(0, '#f5f5f5');
        bgGradient.addColorStop(1, '#e0e0e0');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // 風速の最大値・最小値を取得（正規化用）
        const maxWindSpeed = Math.max(...windData.map(data => data.wind_speed));
        const minWindSpeed = Math.min(...windData.map(data => data.wind_speed));
        const windSpeedRange = maxWindSpeed - minWindSpeed;
        
        // 各都市の位置と風データを準備
        const cityData = windData.map(data => {
            // 緯度・経度をピクセル座標に変換
            const x = Math.floor((data.lon - LON_MIN) / (LON_MAX - LON_MIN) * width);
            const y = Math.floor((LAT_MAX - data.lat) / (LAT_MAX - LAT_MIN) * height);
            
            // 風速を0～1の範囲に正規化
            const normSpeed = windSpeedRange > 0 ? 
                (data.wind_speed - minWindSpeed) / windSpeedRange : 0.5;
            
            // 風向きをラジアンに変換
            const windRad = data.wind_deg * Math.PI / 180;
            
            return {
                city: data.city,
                x: x,
                y: y,
                wind_speed: data.wind_speed,
                norm_speed: normSpeed,
                wind_deg: data.wind_deg,
                wind_rad: windRad,
                wind_x: Math.cos(windRad),
                wind_y: Math.sin(windRad)
            };
        });
        
        // 風の流れを表現する曲線を描画
        drawWindFlowPatterns(ctx, cityData, width, height, maxWindSpeed, minWindSpeed, contrastFactor);
        
        // 風向きの矢印を追加（オプション）
        if (showArrows) {
            drawWindArrows(ctx, cityData);
        }
    }
    
    // 風の流れを表現する線パターンを描画する関数
    function drawWindFlowPatterns(ctx, cityData, width, height, maxWindSpeed, minWindSpeed, contrastFactor) {
        // 各都市からの風の流れを表現する曲線を描画
        cityData.forEach(city => {
            // 風速に基づいた色を取得
            const color = getWindColor(city.wind_speed, maxWindSpeed, minWindSpeed);
            
            // 線の数（風速に比例）
            const lineCount = Math.max(3, Math.ceil(city.wind_speed));
            
            // 風の方向に沿った線を描画
            for (let i = 0; i < lineCount; i++) {
                // ランダムな開始位置
                const startOffset = (Math.random() - 0.5) * 30;
                const startX = city.x + startOffset;
                const startY = city.y + startOffset;
                
                // 風速に応じた線の長さ
                const length = 20 + city.wind_speed * 5 * contrastFactor;
                
                // 終点
                const endX = startX + city.wind_x * length;
                const endY = startY + city.wind_y * length;
                
                // 制御点（風の曲がり具合）
                const curveFactor = 10 + Math.random() * 20;
                const ctrlX = startX + city.wind_x * length * 0.5 - city.wind_y * curveFactor;
                const ctrlY = startY + city.wind_y * length * 0.5 + city.wind_x * curveFactor;
                
                // パスの描画
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
                
                // 線のスタイル設定
                ctx.strokeStyle = color;
                ctx.lineWidth = 1 + Math.random() * 2;
                ctx.globalAlpha = 0.4 + Math.random() * 0.4;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        });
    }
    
    // 風向きの矢印を描画する関数
    function drawWindArrows(ctx, cityData) {
        cityData.forEach(city => {
            // 風速に比例した矢印の長さ
            const arrowLength = Math.min(30, Math.max(10, city.wind_speed * 3));
            
            // 矢印の先端
            const endX = city.x + Math.cos(city.wind_rad) * arrowLength;
            const endY = city.y + Math.sin(city.wind_rad) * arrowLength;
            
            // 矢印の軸を描画
            ctx.beginPath();
            ctx.moveTo(city.x, city.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = 'rgba(0, 158, 79, 0.8)'; // 緑色半透明
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // 矢印の頭部を描画
            const headLength = arrowLength / 3;
            const headWidth = headLength / 2;
            
            const backX = -Math.cos(city.wind_rad) * headLength;
            const backY = -Math.sin(city.wind_rad) * headLength;
            
            const leftX = endX + backX - Math.sin(city.wind_rad) * headWidth;
            const leftY = endY + backY + Math.cos(city.wind_rad) * headWidth;
            
            const rightX = endX + backX + Math.sin(city.wind_rad) * headWidth;
            const rightY = endY + backY - Math.cos(city.wind_rad) * headWidth;
            
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(leftX, leftY);
            ctx.lineTo(rightX, rightY);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 158, 79, 0.8)'; // 緑色半透明
            ctx.fill();
        });
    }
    
    // 画像をダウンロードする処理
    downloadBtn.addEventListener('click', function() {
        console.log('合成画像のダウンロード処理開始');
        
        // 合成画像用のキャンバスを作成
        const combinedCanvas = document.createElement('canvas');
        const logoHeight = logoImage.height || 300;
        const windHeight = windCanvas.height || 200;
        const totalHeight = logoHeight + windHeight;
        
        combinedCanvas.width = 600;
        combinedCanvas.height = totalHeight;
        
        const combinedCtx = combinedCanvas.getContext('2d');
        
        // 背景を白色に
        combinedCtx.fillStyle = 'white';
        combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        
        // ロゴ画像を描画
        combinedCtx.drawImage(logoImage, 0, 0, combinedCanvas.width, logoHeight);
        
        // 風データキャンバスを描画
        combinedCtx.drawImage(windCanvas, 0, logoHeight, combinedCanvas.width, windHeight);
        
        // ダウンロードリンクを作成
        const link = document.createElement('a');
        link.href = combinedCanvas.toDataURL('image/png');
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
        link.download = `fuha-wind-data-${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('ダウンロード完了');
    });
    
    // 初期化
    console.log('初期化処理開始');
    try {
        // ロゴ画像のパスを設定（実際のファイルパスに置き換えてください）
        logoImage.src = "fuha-logo.png";
        logoImage.onload = function() {
            console.log('ロゴ画像読み込み完了');
        };
        logoImage.onerror = function() {
            console.error('ロゴ画像の読み込みに失敗しました');
            // エラーメッセージを表示
            errorMessage.textContent = 'ロゴ画像の読み込みに失敗しました。ファイルパスを確認してください。';
            errorMessage.style.display = 'block';
        };
        
        // 風データキャンバスを初期化
        initializeWindCanvas();
        console.log('初期化完了');
    } catch (error) {
        console.error('初期化エラー:', error);
        errorMessage.textContent = '初期化に失敗しました。ページを再読み込みしてください。';
        errorMessage.style.display = 'block';
    }
});
