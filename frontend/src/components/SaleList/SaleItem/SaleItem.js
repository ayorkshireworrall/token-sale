import React from "react";

const SaleItem = props => {
    return (<>
        <p>Name: {props.name}</p>
        <p>Exchange Rate: {props.rate}</p>
        <p>Remaining Tokens: {props.supply}</p>
    </>)
}

export default SaleItem;