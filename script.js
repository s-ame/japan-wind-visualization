// 簡略化した風データビジュアライゼーションスクリプト
// 日本の主要都市の位置
const JAPAN_REGIONS = [
    {city: "Sapporo", lat: 43.06, lon: 141.35},  // 北海道
    {city: "Tokyo", lat: 35.69, lon: 139.69},    // 東京
    {city: "Osaka", lat: 34.69, lon: 135.50},    // 大阪
    {city: "Fukuoka", lat: 33.61, lon: 130.42},  // 福岡
    {city: "Naha", lat: 26.21, lon: 127.68}      // 沖縄
];

// 日本の地理的範囲
const LON_MIN = 127.0;  // 最西端（沖縄）
const LON_MAX = 146.0;  // 最東端（北海道）
const LAT_MIN = 24.0;   // 最南端（沖縄）
const LAT_MAX = 46.0;   // 最北端（北海道）

// 緑色の色定義
const COLORS = {
    lightGreen: "#E1F5E1",
    green: "#009E4F",
    darkGreen: "#00773C"
};

// DOMContentLoaded イベント
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 読み込み完了');
    
    // 要素の取得
    const windCanvas = document.getElementById('windCanvas');
    const logoImage = document.getElementById('logoImage');
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
    
    // 初期の風データキャンバス描画
    function initializeWindCanvas() {
        console.log('風データキャンバスの初期化');
        if (!windCtx) return;
        
        // キャンバスをクリア
        windCtx.clearRect(0, 0, windCanvas.width, windCanvas.height);
        
        // 背景色を設定
        windCtx.fillStyle = '#f0f0f0';
        windCtx.fillRect(0, 0, windCanvas.width, windCanvas.height);
        
        // 指示テキストを描画
        windCtx.font = '16px Arial';
        windCtx.fillStyle = '#666';
        windCtx.textAlign = 'center';
        windCtx.fillText('「風データを取得して視覚化」ボタンをクリックしてください', 
                         windCanvas.width/2, windCanvas.height/2);
    }
    
    // モックの風データを生成
    function generateMockWindData() {
        return JAPAN_REGIONS.map(region => ({
            city: region.city,
            lon: region.lon,
            lat: region.lat,
            wind_speed: Math.random() * 10 + 1,  // 1~11 m/s
            wind_deg: Math.floor(Math.random() * 360)  // 0~359度
        }));
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
    
    // 風データグラフィックの描画
    function drawWindDataGraphic(canvas, windData, contrastFactor, showArrows) {
        console.log('風データグラフィック描画開始');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, width, height);
        
        // 背景を設定
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        
        // 風速の最大値・最小値を取得
        const maxWindSpeed = Math.max(...windData.map(data => data.wind_speed));
        const minWindSpeed = Math.min(...windData.map(data => data.wind_speed));
        
        // 各都市の位置と風データを準備
        const cityData = windData.map(data => {
            // 緯度・経度をピクセル座標に変換
            const x = Math.floor((data.lon - LON_MIN) / (LON_MAX - LON_MIN) * width);
            const y = Math.floor((LAT_MAX - data.lat) / (LAT_MAX - LAT_MIN) * height);
            
            // 風向きをラジアンに変換
            const windRad = data.wind_deg * Math.PI / 180;
            
            return {
                city: data.city,
                x: x,
                y: y,
                wind_speed: data.wind_speed,
                wind_deg: data.wind_deg,
                wind_rad: windRad,
                wind_x: Math.cos(windRad),
                wind_y: Math.sin(windRad)
            };
        });
        
        // 各都市を点で表示
        cityData.forEach(city => {
            // 風速に応じた色を取得
            let color;
            if (city.wind_speed < (minWindSpeed + maxWindSpeed) / 3) {
                color = COLORS.lightGreen;
            } else if (city.wind_speed < (minWindSpeed + maxWindSpeed) * 2/3) {
                color = COLORS.green;
            } else {
                color = COLORS.darkGreen;
            }
            
            // 都市の位置に円を描画
            ctx.beginPath();
            ctx.arc(city.x, city.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            
            // 都市名を表示
            ctx.font = '12px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(city.city, city.x, city.y - 10);
            
            // 風の流れを表現する線を描画
            const length = 20 + city.wind_speed * 3 * contrastFactor;
            
            ctx.beginPath();
            ctx.moveTo(city.x, city.y);
            ctx.lineTo(city.x + city.wind_x * length, city.y + city.wind_y * length);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 矢印を描画（オプション）
            if (showArrows) {
                const arrowLength = length;
                const endX = city.x + city.wind_x * arrowLength;
                const endY = city.y + city.wind_y * arrowLength;
                
                const headLength = arrowLength / 4;
                const headWidth = headLength / 2;
                
                const backX = -city.wind_x * headLength;
                const backY = -city.wind_y * headLength;
                
                const leftX = endX + backX - city.wind_y * headWidth;
                const leftY = endY + backY + city.wind_x * headWidth;
                
                const rightX = endX + backX + city.wind_y * headWidth;
                const rightY = endY + backY - city.wind_x * headWidth;
                
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(leftX, leftY);
                ctx.lineTo(rightX, rightY);
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
            }
        });
        
        console.log('風データグラフィック描画完了');
    }
    
    // 風データを取得して視覚化ボタンのクリックイベント
    generateBtn.addEventListener('click', function() {
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
            
            // モックデータを生成（API接続の代わりに）
            const windData = generateMockWindData();
            console.log('モックデータ生成:', windData);
            
            // 少し遅延を入れてローディング表示を確認できるようにする
            setTimeout(function() {
                // データをテーブルに表示
                displayWindData(windData);
                
                // 風データグラフィックを生成
                drawWindDataGraphic(windCanvas, windData, contrast, showArrows);
                
                // ローディングを非表示
                loadingIndicator.style.display = 'none';
                dataContainer.style.display = 'block';
                downloadBtn.disabled = false;
                
                console.log('風データ生成完了');
            }, 1000);
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
            // 合成画像用のキャンバスを作成
            const combinedCanvas = document.createElement('canvas');
            const logoWidth = logoImage.width || 600;
            const logoHeight = logoImage.height || 300;
            const windHeight = windCanvas.height || 200;
            
            combinedCanvas.width = logoWidth;
            combinedCanvas.height = logoHeight + windHeight;
            
            const combinedCtx = combinedCanvas.getContext('2d');
            
            // 背景を白色に
            combinedCtx.fillStyle = 'white';
            combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
            
            // ロゴ画像を描画
            combinedCtx.drawImage(logoImage, 0, 0, logoWidth, logoHeight);
            
            // 風データキャンバスを描画
            combinedCtx.drawImage(windCanvas, 0, logoHeight, logoWidth, windHeight);
            
            // ダウンロードリンクを作成
            const link = document.createElement('a');
            link.href = combinedCanvas.toDataURL('image/png');
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
    
    // 初期化
    try {
        console.log('初期化処理開始');
        
        // ロゴ画像の読み込みエラー処理
        logoImage.onerror = function() {
            showError('ロゴ画像の読み込みに失敗しました。ファイルパスを確認してください。');
        };
        
        // 風データキャンバスを初期化
        initializeWindCanvas();
        
        console.log('初期化完了');
    } catch (error) {
        console.error('初期化エラー:', error);
        showError('初期化中にエラーが発生しました: ' + error.message);
    }
});
