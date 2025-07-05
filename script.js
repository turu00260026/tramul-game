document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const startButton = document.getElementById('start-button');
    const sceneImage = document.getElementById('scene-image');
    const characterNameEl = document.getElementById('character-name');
    const messageTextEl = document.getElementById('message-text');
    const choicesContainer = document.getElementById('choices-container');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');
    // ★★★★★★★★★★★★★★★★★★★★★★★★
    // ★ 追加点：「スタートに戻る」ボタンを取得
    // ★★★★★★★★★★★★★★★★★★★★★★★★
    const restartButton = document.getElementById('restart-button');


    let scenarioData = {};
    let gameState = {};

    let typeInterval;
    let currentMessageIndex = 0;
    let isTyping = false;

    // ゲーム状態を初期化
    function initializeGameState() {
        gameState = {
            currentScene: null,
            loveMeters: { hina_love: 0, shiori_love: 0, kirari_love: 0 },
            eventFlags: {
                hina_event1_cleared: false,
                shiori_event1_cleared: false,
                kirari_event1_cleared: false,
            },
            history: []
        };
    }

    // ゲームの初期化処理
    async function initGame() {
        try {
            const response = await fetch('scenario.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            scenarioData = await response.json();
            console.log('ゲーム初期化完了');
            initializeGameState();
            titleScreen.classList.remove('hidden');
            gameScreen.classList.add('hidden');
        } catch (error) {
            console.error('シナリオの読み込みに失敗しました:', error);
        }
    }

    // シーンを描画するメイン関数
    function renderScene(sceneId) {
        const scene = scenarioData.scenes[sceneId];
        if (!scene) {
            console.error(`シーンID "${sceneId}" が見つかりません。`);
            return;
        }
        
        // 履歴の管理
        if (gameState.currentScene && gameState.currentScene !== sceneId) {
            gameState.history.push(gameState.currentScene);
        }
        gameState.currentScene = sceneId;
        
        // イベント完了フラグの更新
        if (sceneId.startsWith('hina_event1_end_')) gameState.eventFlags.hina_event1_cleared = true;
        if (sceneId === 'hina_event1_cancel') gameState.eventFlags.hina_event1_cleared = true; // キャンセルも一種の完了
        if (sceneId.startsWith('shiori_event1_end_')) gameState.eventFlags.shiori_event1_cleared = true;
        if (sceneId.startsWith('kirari_event1_end_')) gameState.eventFlags.kirari_event1_cleared = true;

        if (scene.type === 'logic') {
            handleLogicScene(scene);
            return;
        }
        
        sceneImage.src = `./assets/images/${scene.image}`;
        choicesContainer.innerHTML = '';
        nextButton.style.display = 'none';
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★
        // ★ 追加点：リスタートボタンを隠す
        // ★★★★★★★★★★★★★★★★★★★★★★★★
        restartButton.classList.add('hidden');
        
        currentMessageIndex = 0;
        displayCurrentMessage();
    }
    
    // 現在のメッセージを表示する
    function displayCurrentMessage() {
        const scene = scenarioData.scenes[gameState.currentScene];
        if (!scene || !scene.messages || currentMessageIndex >= scene.messages.length) {
            handleEndOfMessages();
            return;
        }

        const message = scene.messages[currentMessageIndex];
        characterNameEl.textContent = message.name || '';
        typewriter(message.text);
    }

    // タイプライター効果
    function typewriter(text) {
        isTyping = true;
        clearInterval(typeInterval);
        messageTextEl.textContent = '';
        let i = 0;
        typeInterval = setInterval(() => {
            if (i < text.length) {
                messageTextEl.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typeInterval);
                isTyping = false;
                handleMessageDisplayComplete();
            }
        }, 40);
    }

    // 1つのメッセージ表示が完了したときの処理
    function handleMessageDisplayComplete() {
        const scene = scenarioData.scenes[gameState.currentScene];
        if (currentMessageIndex < scene.messages.length - 1) {
            nextButton.style.display = 'block';
        } else {
            handleEndOfMessages();
        }
    }
    
    // シーンの全メッセージ表示が終わった後の処理
    function handleEndOfMessages() {
        const scene = scenarioData.scenes[gameState.currentScene];
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★ 修正点：エンディングシーンの判定を追加（nextが存在しない場合のみ）
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        if (scene.type === 'ending' && !scene.next) {
            nextButton.style.display = 'none';
            restartButton.classList.remove('hidden'); // リスタートボタン表示
        } else if (scene.type === 'choice') {
            nextButton.style.display = 'none';
            renderChoices(scene.choices);
        } else if (scene.next) {
            nextButton.style.display = 'block';
        } else {
            nextButton.style.display = 'none';
        }
    }

    // クリック／Enter時の処理
    function proceed() {
        const scene = scenarioData.scenes[gameState.currentScene];
        if (!scene) return;

        if (isTyping) {
            clearInterval(typeInterval);
            isTyping = false;
            messageTextEl.textContent = scene.messages[currentMessageIndex].text;
            handleMessageDisplayComplete();
            return;
        }
        
        if (currentMessageIndex < scene.messages.length - 1) {
            currentMessageIndex++;
            displayCurrentMessage();
        } else {
            if (scene.next && scene.type !== 'choice') {
                renderScene(scene.next);
            }
        }
    }

    function renderChoices(choices) {
        choicesContainer.innerHTML = '';
        choices.forEach(choice => {
            if (choice.condition) {
                try {
                    const isVisible = new Function('eventFlags', `return ${choice.condition}`)(gameState.eventFlags);
                    if (!isVisible) return;
                } catch (e) { console.error('選択肢の条件評価エラー:', e, '選択肢:', choice); return; }
            }
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.innerHTML = `✅ ${choice.text}`;
            button.onclick = () => handleChoice(choice);
            choicesContainer.appendChild(button);
        });
    }

    function handleChoice(choice) {
        if (choice.effects) {
            for (const key in choice.effects) {
                if (gameState.loveMeters.hasOwnProperty(key)) gameState.loveMeters[key] += choice.effects[key];
            }
        }
        if (choice.next) renderScene(choice.next);
    }

    function handleLogicScene(scene) {
        for (const rule of scene.conditions) {
            try {
                const conditionMet = new Function('loveMeters', 'eventFlags', `return ${rule.if}`)(gameState.loveMeters, gameState.eventFlags);
                if (conditionMet) {
                    renderScene(rule.goto);
                    return;
                }
            } catch (e) { 
                console.error('ロジックの条件評価エラー:', e, 'ルール:', rule);
                // エラーが発生した場合、そのルールは失敗として扱い、次のルールを試行する
                continue;
            }
        }
        if (scene.default_goto) renderScene(scene.default_goto);
    }

    // イベントリスナー
    startButton.addEventListener('click', () => {
        titleScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        const startScene = scenarioData.scenes[scenarioData.start_scene];
        if (startScene.choices && startScene.choices.length > 0) {
            const firstGameSceneId = startScene.choices[0].next;
            renderScene(firstGameSceneId);
        } else {
            renderScene(scenarioData.start_scene);
        }
    });

    nextButton.addEventListener('click', proceed);
    document.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        if (!gameScreen.classList.contains('hidden') && nextButton.style.display !== 'none') {
            proceed();
        }
    });

    backButton.addEventListener('click', () => {
        if (gameState.history.length > 0) {
            const previousSceneId = gameState.history.pop();
            gameState.currentScene = null; 
            renderScene(previousSceneId);
        } else {
            gameScreen.classList.add('hidden');
            titleScreen.classList.remove('hidden');
            initializeGameState();
        }
    });

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★ 追加点：「スタートに戻る」ボタンのクリック処理
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    restartButton.addEventListener('click', () => {
        gameScreen.classList.add('hidden');
        titleScreen.classList.remove('hidden');
        initializeGameState();
    });

    initGame();
});