class GameLogic {
  constructor(players) {
    this.players = players;
    this.snakes = [];
    this.foods = [];
    this.scores = {};
    this.gameOver = false;
    this.winner = null;
    this.reason = '';
    this.loopCount = 0;
    
    this.GRID_WIDTH = 20;
    this.GRID_HEIGHT = 20;
    this.INITIAL_LENGTH = 3;
    this.MAX_FOOD = 3;
    this.POISON_CHANCE = 0.1;
    
    this.initSnakes();
    this.initFoods();
    
    players.forEach(player => {
      this.scores[player.id] = 0;
    });
  }

  initSnakes() {
    const positions = [
      { x: 3, y: Math.floor(this.GRID_HEIGHT / 2), dir: 'right' },
      { x: this.GRID_WIDTH - 4, y: Math.floor(this.GRID_HEIGHT / 2), dir: 'left' }
    ];

    this.players.forEach((player, index) => {
      const pos = positions[index];
      const body = [];
      
      for (let i = 0; i < this.INITIAL_LENGTH; i++) {
        body.push({
          x: pos.x - i,
          y: pos.y
        });
      }

      this.snakes.push({
        id: player.id,
        body,
        direction: pos.dir,
        nextDirection: pos.dir,
        alive: true,
        color: player.color,
        nickname: player.nickname
      });
    });
  }

  initFoods() {
    while (this.foods.length < this.MAX_FOOD) {
      this.generateFood();
    }
  }

  generateFood() {
    const occupied = new Set();
    
    this.snakes.forEach(snake => {
      snake.body.forEach(seg => {
        occupied.add(`${seg.x},${seg.y}`);
      });
    });
    
    this.foods.forEach(food => {
      occupied.add(`${food.x},${food.y}`);
    });

    const available = [];
    for (let x = 0; x < this.GRID_WIDTH; x++) {
      for (let y = 0; y < this.GRID_HEIGHT; y++) {
        if (!occupied.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }

    if (available.length > 0) {
      const pos = available[Math.floor(Math.random() * available.length)];
      this.foods.push({
        id: Math.random().toString(36).substr(2, 9),
        x: pos.x,
        y: pos.y,
        type: Math.random() < this.POISON_CHANCE ? 'poison' : 'normal'
      });
    }
  }

  handleInput(playerId, direction) {
    const snake = this.snakes.find(s => s.id === playerId);
    if (!snake || !snake.alive) return;

    const opposites = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };

    if (opposites[direction] !== snake.direction) {
      snake.nextDirection = direction;
    }
  }

  update() {
    if (this.gameOver) return;

    this.loopCount++;

    this.snakes.forEach(snake => {
      if (snake.alive) {
        snake.direction = snake.nextDirection;
        this.moveSnake(snake);
      }
    });

    this.checkWallCollision();
    this.checkSelfCollision();
    this.checkSnakeCollision();
    this.checkFoodCollision();

    if (this.snakes.filter(s => s.alive).length <= 1) {
      this.endGame();
    }
  }

  moveSnake(snake) {
    const head = { ...snake.body[0] };

    switch (snake.direction) {
      case 'up': head.y--; break;
      case 'down': head.y++; break;
      case 'left': head.x--; break;
      case 'right': head.x++; break;
    }

    snake.body.unshift(head);
    snake.body.pop();
  }

  checkWallCollision() {
    this.snakes.forEach(snake => {
      if (!snake.alive) return;
      
      const head = snake.body[0];
      if (head.x < 0 || head.x >= this.GRID_WIDTH || 
          head.y < 0 || head.y >= this.GRID_HEIGHT) {
        snake.alive = false;
        this.reason = `${snake.nickname} 撞墙了`;
      }
    });
  }

  checkSelfCollision() {
    this.snakes.forEach(snake => {
      if (!snake.alive) return;
      
      const head = snake.body[0];
      const body = snake.body.slice(1);
      
      for (const segment of body) {
        if (head.x === segment.x && head.y === segment.y) {
          snake.alive = false;
          this.reason = `${snake.nickname} 撞到了自己`;
          break;
        }
      }
    });
  }

  checkSnakeCollision() {
    for (let i = 0; i < this.snakes.length; i++) {
      for (let j = i + 1; j < this.snakes.length; j++) {
        const snake1 = this.snakes[i];
        const snake2 = this.snakes[j];
        
        if (!snake1.alive || !snake2.alive) continue;

        const head1 = snake1.body[0];
        const head2 = snake2.body[0];

        if (head1.x === head2.x && head1.y === head2.y) {
          if (snake1.body.length > snake2.body.length) {
            snake2.alive = false;
            this.reason = `${snake2.nickname} 被 ${snake1.nickname} 撞死了`;
          } else if (snake2.body.length > snake1.body.length) {
            snake1.alive = false;
            this.reason = `${snake1.nickname} 被 ${snake2.nickname} 撞死了`;
          } else {
            snake1.alive = false;
            snake2.alive = false;
            this.reason = '两条蛇同归于尽';
          }
          continue;
        }

        const body1 = snake1.body.slice(1);
        const body2 = snake2.body.slice(1);

        for (const seg of body2) {
          if (head1.x === seg.x && head1.y === seg.y) {
            snake1.alive = false;
            this.reason = `${snake1.nickname} 撞到了 ${snake2.nickname} 的身体`;
            break;
          }
        }

        for (const seg of body1) {
          if (head2.x === seg.x && head2.y === seg.y) {
            snake2.alive = false;
            this.reason = `${snake2.nickname} 撞到了 ${snake1.nickname} 的身体`;
            break;
          }
        }
      }
    }
  }

  checkFoodCollision() {
    this.snakes.forEach(snake => {
      if (!snake.alive) return;
      
      const head = snake.body[0];
      
      for (let i = this.foods.length - 1; i >= 0; i--) {
        const food = this.foods[i];
        
        if (head.x === food.x && head.y === food.y) {
          this.foods.splice(i, 1);
          
          if (food.type === 'poison') {
            if (snake.body.length > 2) {
              snake.body.pop();
              snake.body.pop();
              this.scores[snake.id] = Math.max(0, this.scores[snake.id] - 1);
            }
          } else {
            const tail = snake.body[snake.body.length - 1];
            snake.body.push({ ...tail });
            this.scores[snake.id]++;
          }
          
          this.generateFood();
          break;
        }
      }
    });
  }

  endGame() {
    this.gameOver = true;
    
    const aliveSnakes = this.snakes.filter(s => s.alive);
    
    if (aliveSnakes.length === 1) {
      this.winner = aliveSnakes[0].id;
      this.scores[this.winner] += 10;
    } else if (aliveSnakes.length === 0) {
      const lengths = this.snakes.map(s => ({ id: s.id, length: s.body.length }));
      lengths.sort((a, b) => b.length - a.length);
      
      if (lengths[0].length > lengths[1].length) {
        this.winner = lengths[0].id;
        this.scores[this.winner] += 10;
      }
    }
  }

  getState() {
    return {
      snakes: this.snakes.map(snake => ({
        id: snake.id,
        body: snake.body.map(pos => ({ x: pos.x, y: pos.y })),
        direction: snake.direction,
        alive: snake.alive,
        color: snake.color,
        nickname: snake.nickname
      })),
      foods: this.foods.map(food => ({
        x: food.x,
        y: food.y,
        type: food.type
      })),
      scores: { ...this.scores },
      gameOver: this.gameOver,
      winner: this.winner,
      reason: this.reason,
      loopCount: this.loopCount,
      gridWidth: this.GRID_WIDTH,
      gridHeight: this.GRID_HEIGHT
    };
  }
}

module.exports = GameLogic;
