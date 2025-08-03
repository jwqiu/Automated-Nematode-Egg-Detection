// @ts-ignore
import React, { useContext } from 'react';
import { ImageContext } from '../context/ImageContext';
// 如果你想加图表
import { BarChart, Bar, XAxis, YAxis, Tooltip, Label, ResponsiveContainer } from 'recharts';


function BatchResult() {
  const { images } = useContext(ImageContext);

  const detectedImages = images.filter(img => img.detected && !img.error);
  const totalImages = detectedImages.length;
  const totalEggs = detectedImages.reduce((sum, img) => sum + (img.boxes?.length || 0), 0);
  const avgEggs = totalImages ? (totalEggs / totalImages).toFixed(1) : 0;

  // Egg count 分布
  const distribution = {
    '0': 0,
    '1': 0,
    '2': 0,
    '3+': 0,
  };

  detectedImages.forEach(img => {
    const count = img.boxes?.length || 0;
    if (count === 0) distribution['0'] += 1;
    else if (count === 1) distribution['1'] += 1;
    else if (count === 2) distribution['2'] += 1;
    else distribution['3+'] += 1;
  });

  const chartData = Object.entries(distribution).map(([label, value]) => ({
    name: label,
    count: value,
  }));

  return (
    <div className="p-8  text-gray-700 ">
        <p className='mb-4 '>Key Metrics:</p>
        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className='bg-gray-100 w-[100px] rounded-lg shadow-lg p-2'>
                <strong className='text-5xl  text-blue-500 text-center'>{avgEggs}</strong>
                <p className='text-center text-sm'>Avg. Eggs<br />per Image</p>
            </div>
            <div className='bg-gray-100 w-[100px] rounded-lg shadow-lg p-2'>
                <strong className='text-5xl  text-blue-500 text-center'>{totalImages}</strong>
                <p className='text-center text-sm'>Total <br /> Images</p>
            </div>
            <div className='bg-gray-100 w-[100px] rounded-lg shadow-lg p-2'>
                <strong className='text-5xl  text-blue-500 text-center'>{totalEggs}</strong>
                <p className='text-center text-sm'>Total Eggs <br /> Detected</p>
            </div>
        </div>

        <p className='mb-4'>Egg Count Distribution:</p>
        <div className="h-[250px] bg-gray-100 p-4 rounded-lg shadow-lg">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                    >
                        <Label
                        value="Eggs per Image"
                        position="bottom"         // ✅ 改为 bottom
                        offset={0}
                        style={{ fill: '#374151', fontSize: 14 }}
                        />
                    </XAxis>

                    <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                    >
                        <Label
                        value="Number of Images"
                        angle={-90} // ✅ 旋转标签
                        position="insideLeft"
                        offset={10}
                        dy={50} 
                        style={{ fill: '#374151', fontSize: 14 }}
                        />
                    </YAxis>

                    <Tooltip
                        contentStyle={{
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        }}
                        cursor={{ fill: "rgba(59,130,246,0.1)" }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
export default BatchResult;