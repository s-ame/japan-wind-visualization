// 風データ生成に関するコンスタント
// デフォルトのAPIキーは削除し、ユーザー入力を必須に
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

document.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const contrastInput = document.getElementById('contrastInput');
    const contrastValue = document.getElementById('contrastValue');
    const showArrowsCheckbox = document.getElementById('showArrows');
    const apiKeyInput = document.getElementById('apiKey');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const canvas = document.getElementById('windCanvas');
    const ctx = canvas.getContext('2d');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const dataContainer = document.getElementById('dataContainer');
    const windDataTable = document.getElementById('windDataTable');
    const generationTime = document.getElementById('generationTime');
    const errorMessage = document.getElementById('errorMessage');
    
    // コントラスト値の表示を更新
    contrastInput.addEventListener('input', function() {
        contrastValue.textContent = this.value;
    });
    
    // 画像生成ボタンの処理
    generateBtn.addEventListener('click', async function() {
        try {
            // APIキーの確認（必須）
            const apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                throw new Error('OpenWeatherMap APIキーを入力してください。上記の手順でAPIキーを取得できます。');
            }
            
            // 入力値の取得
            const contrast = parseFloat(contrastInput.value);
            const showArrows = showArrowsCheckbox.checked;
            
            // ローディング表示
            loadingIndicator.style.display = 'block';
            dataContainer.style.display = 'none';
            errorMessage.style.display = 'none';
            downloadBtn.disabled = true;
            
            // 風データの取得
            const windData = await fetchAllJapanWindData(apiKey);
            
            // データをテーブルに表示
            displayWindData(windData);
            
            // グラフィックの生成
            drawWindDataGraphic(canvas, windData, contrast, showArrows);
            
            // ローディングを非表示
            loadingIndicator.style.display = 'none';
            dataContainer.style.display = 'block';
            downloadBtn.disabled = false;
            
            // 現在の日時を表示
            generationTime.textContent = new Date().toLocaleString('ja-JP');
        } catch (error) {
            console.error('Error:', error);
            loadingIndicator.style.display = 'none';
            errorMessage.textContent = error.message || 'エラーが発生しました。';
            errorMessage.style.display = 'block';
        }
    });
    
    // 風データの取得
    async function fetchAllJapanWindData(apiKey) {
        const allData = [];
        const baseUrl = "https://api.openweathermap.org/data/2.5/weather";
        
        // すべての都市のデータを並行して取得
        const promises = JAPAN_REGIONS.map(region => {
            const url = `${baseUrl}?q=${region.city},JP&appid=${apiKey}&units=metric`;
            return fetch(url)
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new Error('APIキーが無効です。正しいAPIキーを入力してください。');
                        }
                        throw new Error(`${region.city}の風データ取得に失敗: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    return {
                        city: region.city,
                        lat: region.lat,
                        lon: region.lon,
                        wind_speed: data.wind?.speed || 0,
                        wind_deg: data.wind?.deg || 0
                    };
                })
                .catch(error => {
                    console.error(`Error fetching data for ${region.city}:`, error);
                    // エラーを上位に伝播
                    throw error;
                });
        });
        
        // すべてのリクエストが完了するのを待つ
        return Promise.all(promises);
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
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, width, height);
        
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
        
        // イメージデータを作成
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        
        // 影響範囲の係数
        const influenceFactor = Math.max(width, height) / 5;
        
        // 各ピクセルの値を計算
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // 各都市からの影響を計算
                let totalValue = 0;
                let totalWeight = 0;
                
                for (const city of cityData) {
                    // 都市からの距離を計算
                    const dx = x - city.x;
                    const dy = y - city.y;
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    
                    // 距離に基づく重み
                    let weight;
                    if (distance < 1) {
                        weight = 1.0;
                    } else {
                        weight = 1.0 / (1 + (distance / influenceFactor)**2);
                    }
                    
                    // 風向きに沿った距離を計算
                    const flowDistance = dx * city.wind_x + dy * city.wind_y;
                    
                    // 基本グラデーション（風速に基づく）
                    const baseGradient = (city.norm_speed - 0.5) * 2 * 80;
                    
                    // 風向きに沿った滑らかなグラデーション
                    const directionFactor = 0.015;
                    const directionGradient = Math.tanh(flowDistance * directionFactor) * 50 * city.norm_speed;
                    
                    // 効果を組み合わせる
                    const combinedEffect = baseGradient + directionGradient;
                    
                    // 重み付きの値を累積
                    totalValue += combinedEffect * weight;
                    totalWeight += weight;
                }
                
                // 重み付き平均
                let avgEffect = totalWeight > 0 ? totalValue / totalWeight : 0;
                
                // コントラスト調整
                avgEffect *= contrastFactor;
                
                // グレースケール値に変換（0～255）
                let pixelValue = 128 + avgEffect;
                pixelValue = Math.max(0, Math.min(pixelValue, 255));
                
                // イメージデータにセット（RGBA）
                const offset = (y * width + x) * 4;
                data[offset] = pixelValue;     // R
                data[offset + 1] = pixelValue; // G
                data[offset + 2] = pixelValue; // B
                data[offset + 3] = 255;        // A (不透明)
            }
        }
        
        // イメージデータを描画
        ctx.putImageData(imageData, 0, 0);
        
        // 風向きの矢印を追加（オプション）
        if (showArrows) {
            for (const city of cityData) {
                // 風速に比例した矢印の長さ
                const arrowLength = Math.min(30, Math.max(10, city.wind_speed * 5));
                
                // 矢印の先端
                const endX = city.x + Math.cos(city.wind_rad) * arrowLength;
                const endY = city.y + Math.sin(city.wind_rad) * arrowLength;
                
                // 矢印の軸を描画
                ctx.beginPath();
                ctx.moveTo(city.x, city.y);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
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
                ctx.fillStyle = 'black';
                ctx.fill();
            }
        }
    }
    
    // ダウンロードボタンの処理
    downloadBtn.addEventListener('click', function() {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
        link.download = `japan-wind-data-${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // 初期キャンバス表示
    ctx.font = '20px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('APIキーを入力して「風データを取得して視覚化」ボタンをクリックしてください', canvas.width/2, canvas.height/2);
});
