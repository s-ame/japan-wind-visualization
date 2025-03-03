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

// 点描強度の範囲
const MIN_INTENSITY = 0.3;   // 最低強度
const MAX_INTENSITY = 0.9;   // 最高強度
const BASE_CONTRAST = 1.6;   // 基本コントラスト倍率
const BASE_DOT_DENSITY = 0.5; // 基本点密度

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

// シード値に基づく再現可能な乱数生成器
function createRandomGenerator(seed = 12345) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

document.addEventListener('DOMContentLoaded', async function() {
    // 要素の取得
    const windCanvas = document.getElementById('windCanvas');
    const logoImage = document.getElementById('logoImage');
    const overlayContainer = document.querySelector('.overlay-container');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // 要素の存在確認
    if (!windCanvas || !logoImage || !overlayContainer || !loadingIndicator) {
        console.error('必要な要素が見つかりません');
        return;
    }
    
    // キャンバスのコンテキスト取得
    let windCtx;
    try {
        windCtx = windCanvas.getContext('2d');
    } catch (error) {
        console.error('キャンバスコンテキストの取得に失敗しました:', error);
        return;
    }
    
    // キャンバスのサイズを設定（縦横比2:1）
    function setupCanvas() {
        // コンテナの幅を取得
        const containerWidth = overlayContainer.offsetWidth;
        // 縦横比2:1に基づく高さを計算
        const containerHeight = containerWidth / 2;
        
        // キャンバスの論理サイズを設定（レンダリング品質のため）
        windCanvas.width = containerWidth * 2;  // 高解像度用に2倍
        windCanvas.height = containerHeight * 2;
    }
    
    // プロキシサーバーから風データを取得する関数
    async function fetchWindData() {
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
    
    // 風データグラフィックの描画 - 強化されたコントラストの点描法
    function drawWindDataGraphic(canvas, windData) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // キャンバスをクリア - 背景は白に
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
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
        
        // グレースケールの中間値を生成（後で黒白の2色に変換）
        const intensityMap = new Array(width * height).fill(MIN_INTENSITY);
        
        // 影響範囲の係数
        const influenceFactor = Math.max(width, height) / 5;
        
        // 各ピクセルの値を計算（グレースケール値を生成）
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
                    
                    // 風速を使った基本強度（MIN_INTENSITY～MAX_INTENSITYの範囲）
                    const intensityRange = MAX_INTENSITY - MIN_INTENSITY;
                    
                    const normalizedSpeed = (city.wind_speed - minWindSpeed) / (maxWindSpeed - minWindSpeed || 1);
                    const speedIntensity = MIN_INTENSITY + normalizedSpeed * intensityRange;
                    
                    // 風向きを使った方向性の影響（±0.15程度）
                    const directionFactor = 0.02;
                    const directionEffect = Math.tanh(flowDistance * directionFactor) * 0.15;
                    
                    // 効果を組み合わせる
                    let combinedEffect = speedIntensity + directionEffect;
                    combinedEffect = Math.max(MIN_INTENSITY, Math.min(MAX_INTENSITY, combinedEffect));
                    
                    // 重み付きの値を累積
                    totalValue += combinedEffect * weight;
                    totalWeight += weight;
                }
                
                // 重み付き平均
                let intensity = totalWeight > 0 ? totalValue / totalWeight : MIN_INTENSITY;
                
                // コントラスト調整 - 強化版
                // 中央値からの距離を拡大
                const midPoint = (MIN_INTENSITY + MAX_INTENSITY) / 2;
                intensity = midPoint + (intensity - midPoint) * BASE_CONTRAST;
                
                // 範囲を制限
                intensity = Math.max(MIN_INTENSITY, Math.min(MAX_INTENSITY, intensity));
                
                // グレースケール値を格納
                intensityMap[y * width + x] = intensity;
            }
        }
        
        // イメージデータを作成（ノイズベースの点描で2値化）
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        
        // 点の密度を制御するためのノイズ生成器
        const random1 = createRandomGenerator(12345);
        const random2 = createRandomGenerator(67890);
        const random3 = createRandomGenerator(13579);
        const random4 = createRandomGenerator(24680);
        
        // ベース点密度を使用して全体に点を追加
        const baseNoise = createRandomGenerator(55555);
        
        // 高品質なディザリングパターンで2値化
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const intensity = intensityMap[index];
                
                // 4つの乱数を組み合わせて高品質なパターンを生成
                let noise;
                if ((x % 2 === 0 && y % 2 === 0) || (x % 2 === 1 && y % 2 === 1)) {
                    noise = (random1() + random2()) / 2;
                } else {
                    noise = (random3() + random4()) / 2;
                }
                
                // ベースの点密度を追加（全体的に点を増やす）
                if (baseNoise() < BASE_DOT_DENSITY) {
                    noise *= 0.8; // ノイズ値を下げて点が現れやすくする
                }
                
                // コントラスト強化した閾値比較
                const threshold = noise;
                const pixel = threshold > intensity ? 255 : 0; // 白か黒
                
                const offset = (y * width + x) * 4;
                data[offset] = pixel;     // R
                data[offset + 1] = pixel; // G
                data[offset + 2] = pixel; // B
                data[offset + 3] = 255;   // A (完全不透明)
            }
        }
        
        // イメージデータを描画
        ctx.putImageData(imageData, 0, 0);
    }
    
    // 初期化処理
    async function initialize() {
        // キャンバスのセットアップ
        setupCanvas();
        
        // 風データを取得して視覚化
        try {
            // 風データを取得
            const windData = await fetchWindData();
            
            // 風データグラフィックを生成
            drawWindDataGraphic(windCanvas, windData);
            
            // ローディング表示を非表示
            loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error('風データの生成中にエラーが発生しました:', error);
            // エラー時もローディング表示を非表示
            loadingIndicator.style.display = 'none';
        }
    }
    
    // ロゴ画像が読み込まれたら初期化
    if (logoImage.complete) {
        // すでに読み込まれている場合
        initialize();
    } else {
        // ロゴの読み込み完了を待つ
        logoImage.onload = initialize;
        
        // 読み込みエラー時
        logoImage.onerror = function() {
            console.error('ロゴ画像の読み込みに失敗しました');
            loadingIndicator.style.display = 'none';
        };
    }
    
    // ウィンドウサイズ変更時にキャンバスを再設定
    window.addEventListener('resize', function() {
        setupCanvas();
        
        // キャンバスサイズが変わったので風データを再描画
        try {
            // モックデータを使用して再描画
            const windData = generateMockWindData();
            drawWindDataGraphic(windCanvas, windData);
        } catch (error) {
            console.error('リサイズ時の再描画でエラーが発生しました:', error);
        }
    });
});
