import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    // Remove the data:image/jpeg;base64, prefix if present
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await axios({
      method: "POST",
      url: "https://serverless.roboflow.com/winter-moth-eggs-vmehu/1",
      params: {
        api_key: process.env.API_KEY
      },
      data: base64Data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    console.log('Roboflow response:', response.data);
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}