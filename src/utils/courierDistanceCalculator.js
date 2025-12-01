const SafeTravelTime = 8;
const DC = 10;

const ExhaustionTable = {
  0: {
      noExhaustion: true,
  },
  1: {
      rollReduce: 2,
      speedReduce: 5,
  },
  2: {
      rollReduce: 4,
      speedReduce: 10,
  },
  3: {
      rollReduce: 6,
      speedReduce: 15,
  },
  4: {
      rollReduce: 8,
      speedReduce: 20,
  },
  5: {
      rollReduce: 10,
      speedReduce: 25,
  },
  6: {
      dead: true,
  },
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
function rollConSave(conSaveMod = 0) {
    return getRandomInt(1, 20) + conSaveMod;
}

function checkExhaustion(logger = console, conSaveMod,  exhaustionLevel = 0, dc = DC) {
    const roll = rollConSave(conSaveMod) - (ExhaustionTable[exhaustionLevel].rollReduce || 0);

    logger.log(`Перевірка на втому. Складність: ${dc}. Рівень втоми: ${exhaustionLevel}. Штраф до кидка: ${ExhaustionTable[exhaustionLevel].rollReduce || 0}. Штраф до швидкості: -${ExhaustionTable[exhaustionLevel].speedReduce || 0}. Результат кидка: ${roll}`);

    return roll < dc;
}

function getMaybeFailed(logger, dangerChance) {
    const roll = getRandomInt(1, 100);

    logger.log(`Перевірка на небезпеку. Шанс: ${dangerChance}%. Результат кидка: ${roll}`);
    return roll <= dangerChance;
}

function feetsToMiles(feets = 0) {
    return feets / 10;
}

// targetDistance should be in miles
export function didCreatureGetToTarget(logger = console, targetDistance, flySpeed, conSaveMod, dangerChance) {
    const flySpeedInMiles = feetsToMiles(flySpeed);
    const safeTravelDistance = flySpeedInMiles * SafeTravelTime;

    logger.log('Початок подорожі. Нехай щастить!\n');

    if (getMaybeFailed(logger, dangerChance)) {
        logger.log(`\nО ні... Створіння не долетіло! Непередбачувана небезпека. Годин пройшло: ${getRandomInt(0, SafeTravelTime)}`);
        return false;
    }


    const travelDistanceLeft = targetDistance - safeTravelDistance;
    const hoursPassedDay1 = +((travelDistanceLeft >= 0 ? safeTravelDistance : targetDistance) / flySpeedInMiles).toFixed(1);

    if (travelDistanceLeft <= 0) {
        //logger.log(`Creature successfully reached destination. Hours passed: ${hoursPassedDay1}`);
        logger.log(`\nЧудово! Створіння дісталося пункту призначення. Годин пройшло: ${hoursPassedDay1}`);
        return true;
    }

    //const hoursLeft = Math.ceil(travelDistanceLeft / flySpeedInMiles);

    //logger.log(`Distance to travel left: ${travelDistanceLeft} mile(s). Rolling exhaustion checks.`);
    logger.log(`\nДенна подорож позаду... Залишилося відстані: ${travelDistanceLeft} миль. Робимо перевірки на втому...`);

    let ExhaustionLevel = 0;
    let HoursPassed = 0;

    function hasReached(distanceLeft = 0, exhaustionLevel = ExhaustionLevel, hoursPassed = HoursPassed) {
        if (hoursPassed !== HoursPassed) logger.log(`\nЗалишилося подолати ${distanceLeft} миль.\n`)
        if (ExhaustionTable[exhaustionLevel].dead) {
            //logger.log(`Creature was almost there but have failed. Journey was too exhausting. Hours passed: ${hoursPassedDay1 + hoursPassed}. Distance left: ${distanceLeft} miles`);
            logger.log(`\nЕх, майже дісталося цілі... Подорож виявилася занадто втомлююча. Годин пройшло: ${hoursPassedDay1 + hoursPassed}. Залишилося відстані: ${distanceLeft} миль`);
            return false
        }
        if (getMaybeFailed(logger, dangerChance)) {
            logger.log(`\nО ні... Створіння не долетіло! Непередбачувана небезпека. Годин пройшло: ${hoursPassedDay1 + hoursPassed}. Залишилося відстані: ${distanceLeft} миль`);
            return false;
        }
        // finish
        if (distanceLeft <= 0) {
        logger.log(`\nУспіх! Створіння дісталося цілі. Годин пройшло: ${hoursPassedDay1 + hoursPassed}`);
            return true;
        }

        const currentSpeed = flySpeedInMiles - feetsToMiles(ExhaustionTable[exhaustionLevel].speedReduce || 0);
        // last hour to travel
        if ((distanceLeft - currentSpeed) <= 0) {
            const lastExhaustionCheck = checkExhaustion(
                logger,
                conSaveMod,
                exhaustionLevel,
                DC + hoursPassed + 1,
            )
            const currentExhaustionLevel = exhaustionLevel + lastExhaustionCheck;

            if (ExhaustionTable[currentExhaustionLevel].dead) {
                logger.log(`\nЕх, майже дісталося цілі... Подорож виявилася занадто втомлююча. Годин пройшло: ${hoursPassedDay1 + hoursPassed + 1}.  Залишилося відстані: ${distanceLeft} миль`);
                return false
            } else if (getMaybeFailed(logger, dangerChance)) {
                logger.log(`\nО ні... Створіння не долетіло! Непередбачувана небезпека. Годин пройшло: ${hoursPassedDay1 + hoursPassed + 1}. Залишилося відстані: ${distanceLeft} миль`);
                return false;
            }
            logger.log(`\nПодорож була виснажлива... Але створіння змогло! Годин пройшло: ${hoursPassedDay1 + hoursPassed + 1}. Рівень втоми: ${currentExhaustionLevel}. Штраф до кидка: ${ExhaustionTable[currentExhaustionLevel].rollReduce}. Штраф до швидкості: -${ExhaustionTable[currentExhaustionLevel].speedReduce}.`)
            return true;
        }
        // recursion

        return hasReached(
            distanceLeft - currentSpeed,
            exhaustionLevel + checkExhaustion(
                logger,
                conSaveMod,
                exhaustionLevel,
                DC + hoursPassed,
            ),
            hoursPassed + 1);

    }

    return hasReached(travelDistanceLeft);
}
