import React, { useState } from "react";
import Coin from "../../components/Coin/Coin";
import NewSaleForm from "../../components/NewSaleForm/NewSaleForm";
import SaleList from "../../components/SaleList/SaleList";

const Content = props => {
    const initSaleFormData = {
        name: '',
        supply: 0,
        rate: 1
    };
    const [saleFormData, setSaleFormData] = useState(initSaleFormData)

    const handleSaleFormChange = (field, e) => {
        let data = { ...saleFormData };
        data[field] = e.target.value;
        setSaleFormData(data);
    }

    const addTokenSale = () => {
        console.log('Creating a token sale: ', saleFormData);
        setSaleFormData(initSaleFormData);
    }
    return (
        <>
            <Coin />
            <NewSaleForm data={saleFormData} handleInputChange={handleSaleFormChange} handleSubmit={addTokenSale} />
            <SaleList />
        </>
    )
}

export default Content;