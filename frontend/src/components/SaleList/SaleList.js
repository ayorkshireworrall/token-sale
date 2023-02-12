import React from "react";
import SaleItem from "./SaleItem/SaleItem";

const SaleList = props => {
    let list = (<p>No Tokens For Sale</p>);
    if (props.items) {
        list = props.items.map(item => {
            return <SaleItem name={item.name} rate={item.rate} supply={item.amount} />
        });
    }
    return (<>
        {list}
    </>)
}

export default SaleList;