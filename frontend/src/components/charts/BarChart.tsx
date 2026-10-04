import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface BarChartProps {
  data: any[];
  xAxisKey: string;
  bars: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  layout?: 'horizontal' | 'vertical';
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: any) => string;
  colorByValue?: boolean;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
];

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xAxisKey,
  bars,
  height = 300,
  showGrid = true,
  showLegend = true,
  layout = 'horizontal',
  formatYAxis,
  formatTooltip,
  colorByValue = false,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        {layout === 'horizontal' ? (
          <>
            <XAxis
              dataKey={xAxisKey}
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatYAxis}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatYAxis}
            />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
          formatter={formatTooltip}
        />
        {showLegend && <Legend />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            radius={[4, 4, 0, 0]}
          >
            {colorByValue &&
              data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                />
              ))}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
