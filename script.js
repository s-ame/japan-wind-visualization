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

// プロキシサーバーのURL
const PROXY_API_URL = "https://japan-wind-proxy.netlify.app/api/wind-data";

// モックデータを生成する関数（APIが失敗した場合のフォールバック）
function generateMockWindData() {
    return JAPAN_REGIONS.map(region => ({
        city: region.city,
        lon: region.lon,
        lat: region.lat,
        wind_speed: Math.random() * 10 + 1, // 1~11 m/s
        wind_deg: Math.floor(Math.random() * 360) // 0~359度
    }));
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 読み込み完了');
    
    // 要素の取得
    const windCanvas = document.getElementById('windCanvas');
    const logoImage = document.getElementById('logoImage');
    const windContainer = document.querySelector('.wind-container');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const contrastInput = document.getElementById('contrastInput');
    const contrastValue = document.getElementById('contrastValue');
    const showArrowsCheckbox = document.getElementById('showArrows');
    const errorMessage = document.getElementById('errorMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const dataContainer = document.getElementById('dataContainer');
    const windDataTable = document.getElementById('windDataTable');
    
    // 要素の存在確認
    if (!windCanvas) {
        showError('windCanvas 要素が見つかりません');
        return;
    }
    if (!logoImage) {
        showError('logoImage 要素が見つかりません');
        return;
    }
    
    // キャンバスのコンテキスト取得
    let windCtx;
    try {
        windCtx = windCanvas.getContext('2d');
        console.log('Canvas 2D コンテキスト取得成功');
    } catch (error) {
        showError('キャンバスコンテキストの取得に失敗しました: ' + error.message);
        return;
    }
    
    // エラーメッセージを表示する関数
    function showError(message) {
        console.error('エラー:', message);
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }
    
    // キャンバスのサイズを設定（縦横比2:1）
    function setupCanvas() {
        // コンテナの幅を取得
        const containerWidth = windContainer.offsetWidth;
        // 縦横比2:1に基づく高さを計算
        const containerHeight = containerWidth / 2;
        
        // キャンバスの論理サイズを設定（レンダリング品質のため）
        windCanvas.width = containerWidth * 2;  // 高解像度用に2倍
        windCanvas.height = containerHeight * 2;
        
        console.log(`キャンバスサイズを設定: ${windCanvas.width}x${windCanvas.height} (縦横比2:1)`);
        
        // 初期キャンバス表示を更新
        initializeWindCanvas();
    }
    
    // 初期の風データキャンバス描画
    function initializeWindCanvas() {
        console.log('風データキャンバスの初期化');
        if (!windCtx) return;
        
        // キャンバスをクリア
        windCtx.clearRect(0, 0, windCanvas.width, windCanvas.height);
        
        // 指示テキスト用の背景
        windCtx.fillStyle = '#f0f0f0';
        windCtx.fillRect(0, 0, windCanvas.width, windCanvas.height);
        
        // 指示テキストを描画
        windCtx.font = '32px Arial'; // 高解像度キャンバス用に大きめフォントを設定
        windCtx.fillStyle = '#333';
        windCtx.textAlign = 'center';
        windCtx.textBaseline = 'middle';
        windCtx.fillText('「風データを取得して視覚化」ボタンをクリックしてください', 
                         windCanvas.width/2, windCanvas.height/2);
    }
    
    // ウィンドウサイズ変更時にキャンバスを再設定
    window.addEventListener('resize', function() {
        setupCanvas();
    });
    
    // ロゴ画像の読み込み完了時にキャンバスを設定
    logoImage.onload = function() {
        console.log('ロゴ画像の読み込みが完了しました');
        setupCanvas();
    };
    
    // プロキシサーバーから風データを取得する関数
    async function fetchWindData() {
        console.log('プロキシサーバーから風データを取得中...');
        try {
            const response = await fetch(PROXY_API_URL);
            if (!response.ok) {
                throw new Error(`データの取得に失敗しました（ステータス: ${response.status}）`);
            }
            const data = await response.json();
            console.log('風データ取得成功:', data);
            return data;
        } catch (error) {
            console.warn('APIからのデータ取得に失敗しました:', error);
            console.log('モックデータを使用します');
            return generateMockWindData();
        }
    }
    
    // 風向きから方角を取得する関数
    function getWindDirection(degrees) {
        const directions = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', 
                           '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }
    
    // 風データをテーブルに表示
    function displayWindData(windData) {
        if (!windDataTable) return;
        
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
    
    // 風データグラフィックの描画 - 不透明に設定
    function drawWindDataGraphic(canvas, windData, contrastFactor, showArrows) {
        console.log('風データグラフィック描画開始');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, width, height);
        
        // 背景色を設定
        ctx.fillStyle = '#f0f0f0';
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
                
                // イメージデータにセット（RGBAで、アルファは完全不透明に）
                const offset = (y * width + x) * 4;
                data[offset] = pixelValue;     // R
                data[offset + 1] = pixelValue; // G
                data[offset + 2] = pixelValue; // B
                data[offset + 3] = 255;        // A (完全不透明)
            }
        }
        
        // イメージデータを描画
        ctx.putImageData(imageData, 0, 0);
        
        // 風向きの矢印を追加（オプション）
        if (showArrows) {
            for (const city of cityData) {
                // 風速に比例した矢印の長さ
                const arrowLength = Math.min(60, Math.max(20, city.wind_speed * 10));
                
                // 矢印の先端
                const endX = city.x + Math.cos(city.wind_rad) * arrowLength;
                const endY = city.y + Math.sin(city.wind_rad) * arrowLength;
                
                // 矢印の軸を描画
                ctx.beginPath();
                ctx.moveTo(city.x, city.y);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3;
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
        
        console.log('風データグラフィック描画完了');
    }
    
    // 風データを取得して視覚化ボタンのクリックイベント
    generateBtn.addEventListener('click', async function() {
        console.log('風データ生成ボタンがクリックされました');
        
        try {
            // 入力値の取得
            const contrast = parseFloat(contrastInput.value);
            const showArrows = showArrowsCheckbox.checked;
            
            // ローディング表示
            loadingIndicator.style.display = 'block';
            dataContainer.style.display = 'none';
            errorMessage.style.display = 'none';
            downloadBtn.disabled = true;
            
            // プロキシサーバーから風データを取得
            const windData = await fetchWindData();
            
            // データをテーブルに表示
            displayWindData(windData);
            
            // 風データグラフィックを生成
            drawWindDataGraphic(windCanvas, windData, contrast, showArrows);
            
            // ローディングを非表示
            loadingIndicator.style.display = 'none';
            dataContainer.style.display = 'block';
            downloadBtn.disabled = false;
            
            console.log('風データ生成完了');
        } catch (error) {
            console.error('エラー発生:', error);
            loadingIndicator.style.display = 'none';
            showError('風データの生成中にエラーが発生しました: ' + error.message);
        }
    });
    
    // コントラスト値の表示を更新
    contrastInput.addEventListener('input', function() {
        contrastValue.textContent = this.value;
    });
    
    // ダウンロードボタンのクリックイベント
    downloadBtn.addEventListener('click', function() {
        console.log('ダウンロードボタンがクリックされました');
        
        try {
            // ダウンロード用のキャンバスを作成
            const downloadCanvas = document.createElement('canvas');
            downloadCanvas.width = windCanvas.width;
            downloadCanvas.height = windCanvas.height;
            
            const downloadCtx = downloadCanvas.getContext('2d');
            
            // 風データキャンバスを描画
            downloadCtx.drawImage(windCanvas, 0, 0);
            
            // ダウンロードリンクを作成
            const link = document.createElement('a');
            link.href = downloadCanvas.toDataURL('image/png');
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
            link.download = `fuha-wind-data-${timestamp}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('画像ダウンロード完了');
        } catch (error) {
            console.error('ダウンロードエラー:', error);
            showError('画像のダウンロード中にエラーが発生しました: ' + error.message);
        }
    });
    
    // ロゴ画像の読み込みエラー処理
    logoImage.onerror = function() {
        showError('ロゴ画像の読み込みに失敗しました。ファイルパスを確認してください。');
    };
    
    // 初期設定
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // すでにページが読み込まれている場合
        setupCanvas();
    } else {
        // ページの読み込みを待つ
        window.addEventListener('load', setupCanvas);
    }
    
    console.log('初期化完了');
});
