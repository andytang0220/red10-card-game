import PassScreen from '../PassScreen/PassScreen.jsx';
import HandOrdering from '../HandOrdering/HandOrdering.jsx';

export default function HandOrderingPhase({ orderingReady, orderingPlayerIndex, hand, onReady, onDone }) {
    if (!orderingReady) {
        return (
            <PassScreen
                playerIndex={orderingPlayerIndex}
                subtitle="to arrange your hand"
                onReady={onReady}
            />
        );
    }
    return (
        <HandOrdering
            hand={hand}
            playerIndex={orderingPlayerIndex}
            onDone={onDone}
        />
    );
}
